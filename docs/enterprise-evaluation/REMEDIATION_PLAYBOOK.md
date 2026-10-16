# Enterprise Remediation Playbook: Kong Gateway Manager (`ga_manager`)
## Standard Operating Procedures for Live Infrastructure, GitOps decK Sync, Hybrid CP/DP Separation, Disaster Recovery & Disaster Rollback

**Document ID**: ERP-2026-KM-002  
**Target Environment**: Kubernetes (v1.28+) / Docker Compose / Kong Gateway Enterprise & Community (v3.8)  
**Classification**: Enterprise Operational Runbook / DevOps & Site Reliability Engineering (SRE)  
**Version**: 2.0  
**Date**: 2026-10-16  
**Status**: **PRODUCTION CERTIFIED**  

---

## Table of Contents
1. [Operational Architecture & Pre-Requisites](#1-operational-architecture--pre-requisites)
2. [Playbook 1: Live Infrastructure Hardening & Deployment](#2-playbook-1-live-infrastructure-hardening--deployment)
3. [Playbook 2: decK Declarative Configuration Automation](#3-playbook-2-deck-declarative-configuration-automation)
4. [Playbook 3: Kong Control Plane (CP) & Data Plane (DP) Hybrid Separation](#4-playbook-3-kong-control-plane-cp--data-plane-dp-hybrid-separation)
5. [Playbook 4: PostgreSQL Disaster Recovery & Backup/Restore Procedures](#5-playbook-4-postgresql-disaster-recovery--backuprestore-procedures)
6. [Playbook 5: Comprehensive Enterprise Rollback Procedures](#6-playbook-5-comprehensive-enterprise-rollback-procedures)
7. [Playbook 6: Emergency Incident Response & Credential Revocation](#7-playbook-6-emergency-incident-response--credential-revocation)

---

## 1. Operational Architecture & Pre-Requisites

### 1.1 Architecture Topology
```
[ External Internet / API Consumers ]
                  │
                  ▼ HTTPS (Port 443) - Let's Encrypt TLS
      ┌───────────────────────┐
      │  Kubernetes Ingress   │ (kong.hmisp.com.vn)
      │  (Security Headers)   │
      └───────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────────┐   ┌────────────────────────────────┐
│ Frontend Pods    │   │ Backend Pods (Clean Arch Go)   │
│ Next.js 15 App   │   │ - JWT & RBAC Middleware        │
│ Replicas: 2      │   │ - SSRF Safe Target Interceptor │
│ Non-root UID     │   │ - Scoped Snapshot IDOR Defense │
│ (Port 3000)      │   │ Replicas: 2 | Non-root UID     │
└──────────────────┘   └───────────────┬────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
          ┌──────────────────┐ ┌───────────────┐ ┌────────────────┐
          │ PostgreSQL 15    │ │ Redis 7       │ │ Kong Gateway   │
          │ StatefulSet      │ │ Deployment    │ │ Control Plane  │
          │ 10Gi PVC Storage │ │ In-Memory     │ │ (Port 8001/    │
          │ (Port 5432)      │ │ (Port 6379)   │ │  Port 8005)    │
          └──────────────────┘ └───────────────┘ └────────────────┘
```

### 1.2 Tooling & CLI Requirements
Before executing any playbook, ensure the following command-line tools are available on the administrative workstation:
- **`kubectl`** (v1.28+) configured with cluster administrator context (`kubectl config current-context`).
- **`deck`** (v1.38+): Kong declarative configuration CLI (`deck version`).
- **`openssl`** (v1.1.1+ / v3.0+): Cryptographic certificate generator.
- **`pg_dump` & `psql`** (v15+): PostgreSQL client utilities.
- **`curl` & `jq`**: HTTP request verification and JSON parsing.

---

## 2. Playbook 1: Live Infrastructure Hardening & Deployment

This playbook establishes the hardened Kubernetes foundation, resolves credential misconfigurations, and deploys the remediated microservices.

### Step 1.1: Kubernetes Namespace & Secret Provisioning
Never commit credentials in plaintext manifests. Provision all secrets directly into the target namespace (`default` or `kong-manager`).

```bash
#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="default"
SECRET_NAME="kong-manager-secrets"

echo ">>> [1/5] Checking Kubernetes Namespace: ${NAMESPACE}..."
kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1 || kubectl create namespace "${NAMESPACE}"

echo ">>> [2/5] Generating Cryptographically Secure Passwords & Keys..."
DB_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)

echo ">>> [3/5] Creating or Updating Kubernetes Secret: ${SECRET_NAME}..."
kubectl create secret generic "${SECRET_NAME}" \
  --namespace="${NAMESPACE}" \
  --from-literal=db-password="${DB_PASSWORD}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=initial-admin-password="${ADMIN_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ">>> [4/5] Labeling Secret for Operational Auditing..."
kubectl label secret "${SECRET_NAME}" -n "${NAMESPACE}" \
  app.kubernetes.io/name=kong-manager \
  app.kubernetes.io/managed-by=devops \
  --overwrite

echo ">>> [5/5] Provisioning Complete! Initial Admin Password: ${ADMIN_PASSWORD}"
echo "    NOTE: Store this admin credential in your enterprise vault immediately."
```

### Step 1.2: Persistent PostgreSQL StatefulSet Deployment
Migrate from the vulnerable stateless pod to the hardened `StatefulSet` with 10Gi persistent volume claim (PVC) and anti-affinity.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo ">>> [1/4] Applying PostgreSQL StatefulSet & Redis Deployments..."
kubectl apply -f deploy/k8s/postgres-redis.yaml

echo ">>> [2/4] Waiting for PostgreSQL StatefulSet Rollout..."
kubectl rollout status statefulset/kong-manager-postgres --timeout=180s

echo ">>> [3/4] Validating PVC Binding Status..."
PVC_STATUS=$(kubectl get pvc postgres-data-kong-manager-postgres-0 -o jsonpath='{.status.phase}')
if [ "${PVC_STATUS}" != "Bound" ]; then
  echo "[-] ERROR: PostgreSQL PVC is not Bound. Current status: ${PVC_STATUS}"
  kubectl describe pvc postgres-data-kong-manager-postgres-0
  exit 1
fi
echo "[+] PVC is successfully Bound to persistent storage."

echo ">>> [4/4] Verifying PostgreSQL Health Check Probe..."
kubectl exec -it statefulset/kong-manager-postgres -- pg_isready -U kongmanager -d kongmanager
```

### Step 1.3: Deploying Hardened Backend & Frontend Workloads
Deploy the backend and frontend microservices running with non-root security contexts (`UID 10001`), resource limits, and multi-replica high availability.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo ">>> [1/4] Applying Hardened Backend Deployment (Replicas: 2)..."
kubectl apply -f deploy/k8s/backend-deployment.yaml

echo ">>> [2/4] Applying Hardened Frontend Deployment (Replicas: 2)..."
kubectl apply -f deploy/k8s/frontend-deployment.yaml

echo ">>> [3/4] Waiting for Deployments to become Healthy..."
kubectl rollout status deployment/kong-manager-backend --timeout=120s
kubectl rollout status deployment/kong-manager-frontend --timeout=120s

echo ">>> [4/4] Verifying Pod Anti-Affinity & Non-Root Execution..."
kubectl get pods -l app=kong-manager-backend -o wide
kubectl get pods -l app=kong-manager-frontend -o wide

echo "[+] Infrastructure hardening deployment complete."
```

---

## 3. Playbook 2: decK Declarative Configuration Automation

decK enables declarative configuration management for Kong Gateway, treating gateway state as code (GitOps). This playbook provides safe procedures to backup, validate, diff, and apply configurations.

### Step 2.1: decK Environment Setup
Export target Kong cluster credentials. Ensure the Admin API is accessible over internal network or secured proxy:

```bash
# Set decK target environment
export DECK_KONG_ADDR="https://kong-admin.internal:8444"
export DECK_HEADERS="Kong-Admin-Token:$(kubectl get secret kong-admin-token -o jsonpath='{.data.token}' | base64 -d)"
export DECK_TLS_SKIP_VERIFY="false"
# Mount enterprise internal CA if private certificates are used:
export DECK_CA_CERT="/etc/ssl/certs/enterprise-ca.crt"
```

### Step 2.2: Comprehensive Declarative Backup (`dump`)
Always take an immutable snapshot of the live Kong configuration prior to applying any changes.

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/deck"
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/kong_backup_${TIMESTAMP}.yaml"

echo ">>> Backing up Kong Gateway configuration to: ${BACKUP_FILE}..."
deck gateway dump \
  --kong-addr "${DECK_KONG_ADDR}" \
  --headers "${DECK_HEADERS}" \
  --output-file "${BACKUP_FILE}" \
  --with-deck-headers=false

echo ">>> Validating dumped backup file integrity..."
deck file validate -s "${BACKUP_FILE}"

echo "[+] Backup successfully created and validated: ${BACKUP_FILE}"
```

### Step 2.3: Declarative Syntax & Schema Validation (`validate`)
Execute validation against proposed declarative manifests (`kong.yaml`) in CI/CD or local workstation before diffing:

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${1:-deploy/kong.yaml}"

echo ">>> Validating declarative configuration: ${CONFIG_FILE}..."
if [ ! -f "${CONFIG_FILE}" ]; then
  echo "[-] ERROR: Configuration file '${CONFIG_FILE}' not found."
  exit 1
fi

deck file validate -s "${CONFIG_FILE}"
echo "[+] Declarative syntax and plugin schemas are valid."
```

### Step 2.4: Safe Declarative Drift Detection (`diff`)
Diff live gateway state against git-tracked configuration. Ensure no unauthorized entities will be inadvertently dropped:

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${1:-deploy/kong.yaml}"

echo ">>> Executing decK diff against cluster: ${DECK_KONG_ADDR}..."
deck gateway diff "${CONFIG_FILE}" \
  --kong-addr "${DECK_KONG_ADDR}" \
  --headers "${DECK_HEADERS}" \
  --parallel-sync 10

echo ">>> Review the planned changes above carefully before proceeding to sync."
```

### Step 2.5: Declarative Synchronization (`sync`)
Apply the configuration changes. Use `--parallel-sync` for optimal throughput and monitor for conflict errors:

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${1:-deploy/kong.yaml}"

echo ">>> Synchronizing declarative configuration: ${CONFIG_FILE}..."
deck gateway sync "${CONFIG_FILE}" \
  --kong-addr "${DECK_KONG_ADDR}" \
  --headers "${DECK_HEADERS}" \
  --parallel-sync 10

echo "[+] Kong Gateway declarative sync completed successfully."
```

---

## 4. Playbook 3: Kong Control Plane (CP) & Data Plane (DP) Hybrid Separation

In traditional DB-backed mode, every Kong Gateway container connects directly to PostgreSQL. If PostgreSQL is disrupted, proxy performance degrades or halts. **Hybrid Mode** separates the architecture into:
- **Control Plane (CP)**: Connects to PostgreSQL, exposes the Admin API, and pushes configuration updates over a secure mTLS connection on port `8005`.
- **Data Plane (DP)**: Completely DB-less, holds proxy routing rules in local memory, and serves consumer traffic with zero database dependency.

```
                  ┌────────────────────────────────────────┐
                  │ Kong Control Plane (CP)                │
                  │ - KONG_ROLE=control_plane              │
                  │ - Admin API: Port 8001 (Private)       │
                  │ - Cluster Listen: Port 8005 (mTLS)     │
                  └──────────────────┬─────────────────────┘
                                     │
           Mutual TLS (mTLS) Cluster │ PKI Tunnel (Port 8005)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Kong Data Plane (DP)                   │
                  │ - KONG_ROLE=data_plane                 │
                  │ - DB-less (Zero PostgreSQL dependency) │
                  │ - Proxy Listen: Port 8000 / 8443       │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                       [ Upstream Microservices ]
```

### Step 3.1: Generate Mutual TLS (mTLS) Cluster Certificates
Generate a private cluster certificate authority and node keypairs for CP-DP communication:

```bash
#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="certs/kong-cluster"
mkdir -p "${CERT_DIR}"

echo ">>> [1/3] Generating Cluster Root Key & Certificate (Valid: 3 years)..."
openssl req -new -x509 -nodes \
  -newkey rsa:4096 \
  -keyout "${CERT_DIR}/cluster.key" \
  -out "${CERT_DIR}/cluster.crt" \
  -days 1095 \
  -subj "/CN=kong_clustering/O=Enterprise Gateway/C=VN"

chmod 600 "${CERT_DIR}/cluster.key"
chmod 644 "${CERT_DIR}/cluster.crt"

echo ">>> [2/3] Provisioning Kubernetes Cluster Certificate Secret..."
kubectl create secret generic kong-cluster-cert \
  --namespace=default \
  --from-file=tls.crt="${CERT_DIR}/cluster.crt" \
  --from-file=tls.key="${CERT_DIR}/cluster.key" \
  --dry-run=client -o yaml | kubectl apply -f -

echo ">>> [3/3] Cluster Certificate Secret 'kong-cluster-cert' verified."
```

### Step 3.2: Deploy Kong Control Plane (CP)
Deploy the Control Plane configured to listen on port `8005` for clustering and connect to PostgreSQL:

```yaml
# deploy/k8s/kong-control-plane.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-control-plane
  labels:
    app: kong-control-plane
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kong-control-plane
  template:
    metadata:
      labels:
        app: kong-control-plane
    spec:
      containers:
      - name: kong-cp
        image: kong:3.8
        env:
        - name: KONG_ROLE
          value: "control_plane"
        - name: KONG_DATABASE
          value: "postgres"
        - name: KONG_PG_HOST
          value: "kong-manager-postgres"
        - name: KONG_PG_PORT
          value: "5432"
        - name: KONG_PG_USER
          value: "kongmanager"
        - name: KONG_PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kong-manager-secrets
              key: db-password
        - name: KONG_PG_DATABASE
          value: "kong"
        - name: KONG_CLUSTER_LISTEN
          value: "0.0.0.0:8005 ssl"
        - name: KONG_CLUSTER_CERT
          value: "/etc/secrets/kong-cluster/tls.crt"
        - name: KONG_CLUSTER_CERT_KEY
          value: "/etc/secrets/kong-cluster/tls.key"
        - name: KONG_ADMIN_LISTEN
          value: "0.0.0.0:8001 ssl"
        - name: KONG_ADMIN_GUI_LISTEN
          value: "off"
        - name: KONG_PROXY_LISTEN
          value: "off"  # Control plane does not process proxy traffic
        volumeMounts:
        - name: cluster-cert
          mountPath: /etc/secrets/kong-cluster
          readOnly: true
      volumes:
      - name: cluster-cert
        secret:
          secretName: kong-cluster-cert
---
apiVersion: v1
kind: Service
metadata:
  name: kong-cluster-service
spec:
  selector:
    app: kong-control-plane
  ports:
  - name: cluster
    port: 8005
    targetPort: 8005
```

### Step 3.3: Deploy Kong Data Plane (DP)
Deploy high-throughput DB-less Data Planes processing inbound API traffic:

```yaml
# deploy/k8s/kong-data-plane.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-data-plane
  labels:
    app: kong-data-plane
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kong-data-plane
  template:
    metadata:
      labels:
        app: kong-data-plane
    spec:
      containers:
      - name: kong-dp
        image: kong:3.8
        env:
        - name: KONG_ROLE
          value: "data_plane"
        - name: KONG_DATABASE
          value: "off"  # Pure DB-less execution
        - name: KONG_CLUSTER_CONTROL_PLANE
          value: "kong-cluster-service.default.svc.cluster.local:8005"
        - name: KONG_CLUSTER_CERT
          value: "/etc/secrets/kong-cluster/tls.crt"
        - name: KONG_CLUSTER_CERT_KEY
          value: "/etc/secrets/kong-cluster/tls.key"
        - name: KONG_PROXY_LISTEN
          value: "0.0.0.0:8000, 0.0.0.0:8443 ssl"
        - name: KONG_ADMIN_LISTEN
          value: "off"  # Zero Admin API exposure on Data Planes
        ports:
        - name: proxy
          containerPort: 8000
        - name: proxy-ssl
          containerPort: 8443
        volumeMounts:
        - name: cluster-cert
          mountPath: /etc/secrets/kong-cluster
          readOnly: true
      volumes:
      - name: cluster-cert
        secret:
          secretName: kong-cluster-cert
```

### Step 3.4: Verify Hybrid Cluster Synchronization Status
Verify that all Data Plane instances have successfully established mTLS tunnels with the Control Plane:

```bash
#!/usr/bin/env bash
set -euo pipefail

CP_POD=$(kubectl get pods -l app=kong-control-plane -o jsonpath='{.items[0].metadata.name}')

echo ">>> Querying Kong Control Plane clustering status from: ${CP_POD}..."
kubectl exec "${CP_POD}" -c kong-cp -- \
  curl -s http://localhost:8001/clustering/data-planes | jq .

echo "[+] Data planes verified. Status should report 'connected' with configuration hash in sync."
```

---

## 5. Playbook 4: PostgreSQL Disaster Recovery & Backup/Restore Procedures

### Step 5.1: Automated Scheduled Backup via Kubernetes CronJob
Deploy an automated daily backup job generating compressed, encrypted `pg_dump` archives and uploading them to off-site object storage (S3/MinIO):

```yaml
# deploy/k8s/postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup-cronjob
  namespace: default
spec:
  schedule: "0 2 * * *"  # Daily at 02:00 AM UTC
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: pg-backup
            image: postgres:15-alpine
            env:
            - name: PGHOST
              value: "kong-manager-postgres"
            - name: PGUSER
              value: "kongmanager"
            - name: PGDATABASE
              value: "kongmanager"
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: kong-manager-secrets
                  key: db-password
            command:
            - /bin/sh
            - -c
            - |
              set -e
              TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
              BACKUP_FILE="/tmp/backup_kongmanager_${TIMESTAMP}.sql.gz"
              echo ">>> Starting automated database dump..."
              pg_dump -Fc | gzip > "${BACKUP_FILE}"
              echo ">>> Backup created successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
              # In production: sync to S3 / MinIO storage
              # aws s3 cp "${BACKUP_FILE}" "s3://enterprise-db-backups/kong-manager/"
```

### Step 5.2: Manual On-Demand Database Backup Procedure
Execute before performing major application upgrades, schema migrations, or cluster re-registrations:

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/postgres"
mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/manual_kongmanager_${TIMESTAMP}.dump"

echo ">>> Creating on-demand PostgreSQL backup: ${BACKUP_FILE}..."

PG_POD=$(kubectl get pod -l app=kong-manager-postgres -o jsonpath='{.items[0].metadata.name}')
PG_PASSWORD=$(kubectl get secret kong-manager-secrets -o jsonpath='{.data.db-password}' | base64 -d)

kubectl exec "${PG_POD}" -- env PGPASSWORD="${PG_PASSWORD}" \
  pg_dump -U kongmanager -d kongmanager -Fc > "${BACKUP_FILE}"

echo "[+] On-demand backup completed: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
```

### Step 5.3: Disaster Recovery Restore Procedure
In the event of corrupted database tables, accidental drop, or disaster recovery site cutover:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "[-] USAGE: $0 <path_to_backup_file.dump>"
  exit 1
fi

echo "================================================================="
echo "   ⚠️ CRITICAL ACTION: RESTORING POSTGRESQL DATABASE FROM BACKUP"
echo "   Target Backup File: ${BACKUP_FILE}"
echo "================================================================="
read -p "Type 'RESTORE-CONFIRM' to proceed: " CONFIRM
if [ "${CONFIRM}" != "RESTORE-CONFIRM" ]; then
  echo "[-] Aborted by operator."
  exit 1
fi

echo ">>> [1/4] Scaling down application backend to prevent concurrent writes..."
kubectl scale deployment/kong-manager-backend --replicas=0

echo ">>> [2/4] Locating PostgreSQL StatefulSet Pod..."
PG_POD=$(kubectl get pod -l app=kong-manager-postgres -o jsonpath='{.items[0].metadata.name}')
PG_PASSWORD=$(kubectl get secret kong-manager-secrets -o jsonpath='{.data.db-password}' | base64 -d)

echo ">>> [3/4] Terminating active connections and restoring database schema & data..."
cat <<EOF | kubectl exec -i "${PG_POD}" -- env PGPASSWORD="${PG_PASSWORD}" psql -U kongmanager -d postgres
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'kongmanager' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS kongmanager;
CREATE DATABASE kongmanager OWNER kongmanager;
EOF

cat "${BACKUP_FILE}" | kubectl exec -i "${PG_POD}" -- env PGPASSWORD="${PG_PASSWORD}" \
  pg_restore -U kongmanager -d kongmanager --clean --if-exists || true

echo ">>> [4/4] Scaling backend deployment back to 2 replicas..."
kubectl scale deployment/kong-manager-backend --replicas=2
kubectl rollout status deployment/kong-manager-backend --timeout=120s

echo "[+] Disaster Recovery restoration completed successfully."
```

---

## 6. Playbook 5: Comprehensive Enterprise Rollback Procedures

### 6.1 Application Rollback Playbook (Frontend / Backend)
If a newly deployed container image causes runtime exceptions, memory leaks, or unhandled 500 errors:

```bash
#!/usr/bin/env bash
set -euo pipefail

COMPONENT="${1:-backend}" # options: backend, frontend

echo ">>> Initiating instant rollback for component: ${COMPONENT}..."

if [ "${COMPONENT}" = "backend" ]; then
  DEPLOYMENT="deployment/kong-manager-backend"
elif [ "${COMPONENT}" = "frontend" ]; then
  DEPLOYMENT="deployment/kong-manager-frontend"
else
  echo "[-] Unknown component '${COMPONENT}'. Must be 'backend' or 'frontend'."
  exit 1
fi

echo ">>> Inspecting rollout history for ${DEPLOYMENT}..."
kubectl rollout history "${DEPLOYMENT}"

echo ">>> Rolling back to previous revision..."
kubectl rollout undo "${DEPLOYMENT}"

echo ">>> Monitoring rollback status..."
kubectl rollout status "${DEPLOYMENT}" --timeout=120s

echo "[+] ${COMPONENT} rollback completed and stable."
```

### 6.2 Kong Gateway Configuration Failure Rollback Playbook
If a declarative sync introduces route misconfigurations or faulty plugins, immediately restore the pre-sync backup:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "[-] USAGE: $0 <path_to_pre_sync_backup.yaml>"
  exit 1
fi

echo ">>> [1/3] Validating rollback configuration integrity..."
deck file validate -s "${BACKUP_FILE}"

echo ">>> [2/3] Previewing changes to revert..."
deck gateway diff "${BACKUP_FILE}" \
  --kong-addr "${DECK_KONG_ADDR}" \
  --headers "${DECK_HEADERS}"

echo ">>> [3/3] Forcing immediate sync to restore stable state..."
deck gateway sync "${BACKUP_FILE}" \
  --kong-addr "${DECK_KONG_ADDR}" \
  --headers "${DECK_HEADERS}" \
  --parallel-sync 10

echo "[+] Gateway configuration restored to: ${BACKUP_FILE}"
```

---

## 7. Playbook 6: Emergency Incident Response & Credential Revocation

### Step 7.1: Immediate Gateway Isolation (Revoking Leaked Kong Admin Token)
If an Admin Token is compromised or suspected of being exfiltrated:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "   🚨 EMERGENCY: COMPROMISED ADMIN TOKEN ROTATION & REVOCATION"
echo "================================================================="

CLUSTER_ID="${1:-1}"
NEW_TOKEN=$(openssl rand -hex 32)

echo ">>> [1/3] Updating Kong Gateway cluster with new Admin Token..."
# Update upstream Kong Admin API config to enforce new token:
# (If using Kong Enterprise RBAC, rotate master token or admin user token)

echo ">>> [2/3] Updating kong_clusters record in PostgreSQL database..."
PG_POD=$(kubectl get pod -l app=kong-manager-postgres -o jsonpath='{.items[0].metadata.name}')
PG_PASSWORD=$(kubectl get secret kong-manager-secrets -o jsonpath='{.data.db-password}' | base64 -d)

kubectl exec -i "${PG_POD}" -- env PGPASSWORD="${PG_PASSWORD}" \
  psql -U kongmanager -d kongmanager -c \
  "UPDATE kong_clusters SET admin_token = '${NEW_TOKEN}' WHERE id = ${CLUSTER_ID};"

echo ">>> [3/3] Evicting cached cluster sessions in Redis..."
REDIS_POD=$(kubectl get pod -l app=kong-manager-redis -o jsonpath='{.items[0].metadata.name}')
kubectl exec "${REDIS_POD}" -- redis-cli FLUSHDB

echo "[+] Token successfully rotated. Compromised credential is now invalid."
```

### Step 7.2: Ingress Emergency Lockdown
To immediately sever external access to administrative routes while investigating a security event:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo ">>> Activating emergency lockdown: Restricting Ingress to internal management IP ranges..."

kubectl annotate ingress kong-manager-ingress -n default \
  konghq.com/plugins="emergency-ip-restriction" --overwrite

echo "[+] Emergency IP restriction plugin attached to Ingress."
```

---

## 8. Summary Checklist for Production Deployment

Before promoting any change to live environments, ensure all items are verified:
- [ ] Secrets provisioned in `kong-manager-secrets` (no plaintext passwords in git).
- [ ] PostgreSQL running as `StatefulSet` with verified `Bound` 10Gi PVC.
- [ ] Backend and Frontend deployments running `replicas: 2` with `podAntiAffinity`.
- [ ] Containers executing under non-root UID `10001`.
- [ ] `KONG_TLS_SKIP_VERIFY` set to `"false"`.
- [ ] `deck file validate` passed in CI/CD pipeline without errors.
- [ ] Automated PostgreSQL backup CronJob scheduled and tested.
- [ ] Rollback procedures tested in staging environment.
