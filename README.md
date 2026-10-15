# Gateway Manager (Kong Enterprise Control Plane)

[![Go Version](https://img.shields.io/badge/Go-1.26+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Kong Gateway](https://img.shields.io/badge/Kong%20Gateway-3.8+-003459?style=flat&logo=kong)](https://konghq.com)
[![CI Pipeline](https://github.com/Dzungnguyenmanh/ga_manager/actions/workflows/ci.yml/badge.svg)](https://github.com/Dzungnguyenmanh/ga_manager/actions/workflows/ci.yml)
[![Docker Images](https://img.shields.io/badge/GHCR-Container%20Registry-blue?logo=docker)](https://github.com/Dzungnguyenmanh/ga_manager/pkgs/container/ga_manager%2Fbackend)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Gateway Manager** là nền tảng Control Plane cấp doanh nghiệp (Enterprise API Control Plane) được thiết kế chuyên biệt để quản trị, cấu hình, kiểm soát an toàn và vận hành liên tục 24/7 các cụm **Kong API Gateway**.

Khác với các công cụ Admin API GUI cơ bản, Gateway Manager cung cấp các chuẩn mực quản trị Production khắt khe: **Kiểm soát xung đột định tuyến (Route Conflict Detection)**, **Phân cấp cảnh báo chứng chỉ SSL đa tầng (7/14/30 ngày)**, **Kiểm tra trước thay đổi (Dry-Run Diff decK)**, **Che giấu Secret an toàn (Data Masking)**, **Truy vết thay đổi tự động (Audit Logging)** và **Sơ đồ luồng trực quan (Topology Flow Graph)**.

---

## 📑 Mục lục

- [1. Kiến trúc hệ thống](#1-kiến-trúc-hệ-thống)
- [2. Các tính năng nổi bật](#2-các-tính-năng-nổi-bật)
- [3. Yêu cầu môi trường (Prerequisites)](#3-yêu-cầu-môi-trường-prerequisites)
- [4. Hướng dẫn khởi chạy nhanh (Quick Start)](#4-hướng-dẫn-khởi-chạy-nhanh-quick-start)
  - [Cách 1: Triển khai toàn bộ với Docker Compose (Khuyên dùng)](#cách-1-triển-khai-toàn-bộ-với-docker-compose-khuyên-dùng)
  - [Cách 2: Khởi chạy môi trường phát triển cục bộ (Local Dev)](#cách-2-khởi-chạy-môi-trường-phát-triển-cục-bộ-local-dev)
  - [Cách 3: Triển khai trên Kubernetes](#cách-3-triển-khai-trên-kubernetes)
- [5. Cấu hình biến môi trường (Environment Variables)](#5-cấu-hình-biến-môi-trường-environment-variables)
- [6. Cấu trúc thư mục dự án](#6-cấu-trúc-thư-mục-dự-án)
- [7. Kiểm thử & Đảm bảo chất lượng (QA & Testing)](#7-kiểm-thử--đảm-bảo-chất-lượng-qa--testing)
- [8. Quy trình CI/CD & Triển khai tự động (CI/CD Pipeline)](#8-quy-trình-cicd--triển-khai-tự-động-cicd-pipeline)
- [9. Đóng góp & Bản quyền](#9-đóng-góp--bản-quyền)

---

## 1. Kiến trúc hệ thống

Gateway Manager tuân thủ kiến trúc phân tách rõ ràng giữa **Control Plane** (Quản lý) và **Data Plane** (Xử lý traffic thực):

```
                     ┌───────────────────────────────────────────────┐
                     │               Trình duyệt Web                 │
                     │          (Next.js 16 + React 19 UI)           │
                     └───────────────────────┬───────────────────────┘
                                             │ HTTP/JSON (:3000)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │            Gateway Manager Backend            │
                     │            (Go 1.26 + Gin Router)             │
                     └───────┬───────────────────────────────┬───────┘
                             │                               │
             pgxpool / SQL   │                               │ Kong Admin REST API
                             ▼                               ▼
    ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
    │     PostgreSQL Database (App)    │   │           Kong Gateway           │
    │  - Clusters & Environments       │   │  (Traditional, DB-less, Hybrid)  │
    │  - Immutable Snapshots           │   ├──────────────────────────────────┤
    │  - Audit Logs & Metadata         │   │ Proxy Ports: :8000 (HTTP) / :8443│
    └──────────────────────────────────┘   │ Admin API:   :8001 (Internal)    │
                                           └──────────────────────────────────┘
```

---

## 2. Các tính năng nổi bật

### 🛡️ Quản trị an toàn Production (Production Governance)
- **Kiểm soát môi trường đa cấp (`DEV` / `STG` / `PROD`)**: Khóa bảo vệ và yêu cầu xác nhận gõ tên tài nguyên trước khi xóa trên cụm Production.
- **Bắt buộc Metadata chuẩn hóa**: Mọi Service trên cụm PROD bắt buộc phải khai báo `API Owner` (Đội ngũ phụ trách) và mức độ quan trọng `Criticality` (`critical`, `high`, `medium`, `low`).
- **Phát hiện xung đột định tuyến (Route Conflict Detection)**: Tự động phân tích trùng lặp Paths, Hosts và HTTP Methods giữa Route mới và Route hiện hữu trước khi apply.

### 🔄 decK GitOps & Dry-Run Diff Engine
- **Mô phỏng thay đổi (Dry-Run Diff)**: So sánh trạng thái cấu hình khai báo (Desired State) với Gateway hiện tại (Actual State), tính toán chính xác số lượng entity thêm mới, sửa đổi hoặc xóa mà không gây gián đoạn cụm Kong.
- **Che giấu Secret an toàn (Secret Masking)**: Tự động che giấu (`mask_secrets=true`) toàn bộ API Key, JWT Secret, mật khẩu Basic Auth và Private Key khi Export/Dump cấu hình.
- **Quản lý Snapshot & Rollback**: Chụp ảnh cấu hình cluster tức thời, lưu trữ dạng JSONB bất biến và khôi phục (Rollback) chỉ với một thao tác.
- **Quảng bá cấu hình (Cluster Promotion)**: Tự động chuyển giao cấu hình đã kiểm thử từ môi trường `DEV` sang `STG` hoặc `PROD`.

### 🔐 Trung tâm chứng chỉ & Xác thực (SSL & Security Hub)
- **Cảnh báo hết hạn chứng chỉ đa tầng**:
  - 🚨 **Khẩn cấp ($\le 7$ ngày)**: Nhấp nháy đỏ báo động để thay thế ngay lập tức.
  - ⚠️ **Cảnh báo cao ($\le 14$ ngày)**: Nhắc nhở quy trình gia hạn.
  - ⏰ **Sắp hết hạn ($\le 30$ ngày)**: Lên kế hoạch cấp phát chứng chỉ mới.
- **Quản lý SNIs & CA Certificates**: Hỗ trợ TLS Termination và mTLS upstream an toàn.
- **Consumer Credentials Hub**: Cấp phát và quản lý API Key, JWT (HS256/RS256/ES256), Basic Auth, và phân nhóm ACL Groups với chế độ ẩn/hiện mật khẩu và copy an toàn.

### 🌐 Quản lý Lưu lượng & Cân bằng tải (Traffic & Upstreams)
- **Services & Routes**: Đăng ký backend, tự động bóc tách URL, cấu hình timeouts, retries, path stripping, preserve host, regex priority.
- **Upstreams & Targets**: Cân bằng tải theo thuật toán `round-robin`, `consistent-hashing`, `least-connections`, `latency`.
- **Active & Passive Health Checks**: Giám sát sức khỏe node mục tiêu, hỗ trợ cô lập node lỗi ngay tức khắc mà không làm gián đoạn API.

### 📊 Giám sát & Quan sát toàn diện (Observability & Audit)
- **Golden Signals Dashboard**: Theo dõi số kết nối Active, tổng Request, trạng thái Read/Write, Keep-Alive, trạng thái Database và thông tin Hostname node.
- **Topology Flow Graph**: Trực quan hóa toàn bộ sơ đồ định tuyến: `HTTP Ingress` ➔ `Route` ➔ `Plugins` ➔ `Service` ➔ `Targets`.
- **Audit Logs truy vết**: Tự động ghi nhận mọi thao tác CREATE, UPDATE, DELETE, RESTORE, SYNC với đầy đủ thông tin: User, IP, thời gian, ID tài nguyên và Payload đã khử dữ liệu nhạy cảm.
- **Công cụ chẩn đoán (Diagnostics & API Test)**: Tích hợp sẵn tính năng Ping, Socket test, DNS check và Request Tester trực tiếp trên giao diện.

---

## 3. Yêu cầu môi trường (Prerequisites)

Để cài đặt và phát triển Gateway Manager, hệ thống cần đáp ứng:

| Thành phần | Phiên bản tối thiểu khuyến nghị |
| :--- | :--- |
| **Docker & Docker Compose** | Docker 24.0+ / Compose v2.20+ |
| **Node.js** | v20.x hoặc v22.x LTS |
| **Go** | Go 1.24+ (khuyên dùng Go 1.26+) |
| **PostgreSQL** | v15+ (dùng lưu trữ clusters, snapshots, audit) |
| **Kong Gateway** | Kong 3.x+ (Traditional DB, DB-less, hoặc Hybrid) |

---

## 4. Hướng dẫn khởi chạy nhanh (Quick Start)

### Cách 1: Triển khai toàn bộ với Docker Compose (Khuyên dùng)

Thư mục `deploy/docker-compose.yml` đã đóng gói sẵn: Kong Gateway 3.8, PostgreSQL cho Kong, PostgreSQL cho Gateway Manager, Redis, Backend (Go) và Frontend (Next.js).

Chạy lệnh triển khai:
```bash
# Di chuyển vào thư mục deploy
cd deploy

# Khởi động toàn bộ cụm dịch vụ
docker compose up -d --build
```

Hoặc sử dụng script tự động:
- **Linux/macOS**:
  ```bash
  chmod +x deploy/scripts/deploy.sh
  ./deploy/scripts/deploy.sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\deploy\scripts\deploy.ps1
  ```

Sau khi hoàn tất, truy cập các địa chỉ:
- 🖥️ **Gateway Manager UI**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend API**: [http://localhost:8080](http://localhost:8080)
- 🔌 **Kong Admin API**: [http://localhost:8001](http://localhost:8001)
- 🚀 **Kong Proxy Ingress**: [http://localhost:8000](http://localhost:8000)

---

### Cách 2: Khởi chạy môi trường phát triển cục bộ (Local Dev)

#### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL
Khởi tạo cơ sở dữ liệu cho Gateway Manager:
```bash
# Chuỗi kết nối mẫu: postgres://kongmanager:kongmanager_password@localhost:5432/kongmanager?sslmode=disable
createdb -U postgres kongmanager
```

#### Bước 2: Chạy Backend (Go)
```bash
cd backend

# Cài đặt thư viện
go mod download

# Thiết lập biến môi trường và chạy
export DATABASE_URL="postgres://kongmanager:kongmanager_password@localhost:5432/kongmanager?sslmode=disable"
export PORT="8080"
go run cmd/api/main.go
```
*Backend sẽ tự động khởi tạo bảng (`kong_clusters`, `snapshots`, `audit_logs`, `users`) nếu chưa tồn tại.*

#### Bước 3: Chạy Frontend (Next.js)
```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy dev server
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

### Cách 3: Triển khai trên Kubernetes

Các manifests triển khai đã sẵn sàng trong thư mục `deploy/k8s`:
```bash
# Áp dụng cơ sở dữ liệu và cache
kubectl apply -f deploy/k8s/postgres-redis.yaml

# Triển khai Backend service
kubectl apply -f deploy/k8s/backend-deployment.yaml

# Triển khai Frontend service
kubectl apply -f deploy/k8s/frontend-deployment.yaml
```

---

## 5. Cấu hình biến môi trường (Environment Variables)

### Backend (`backend/`)
| Tên biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://kongmanager:kongmanager_password@localhost:5432/kongmanager?sslmode=disable` | Chuỗi kết nối PostgreSQL lưu cấu hình nội bộ |
| `PORT` | `8080` | Port lắng nghe của Go HTTP Server |
| `KONG_MANAGER_ENV` | `development` | Môi trường chạy backend (`development` / `production`) |
| `REDIS_URL` | `redis://localhost:6379/0` | Chuỗi kết nối Redis cache (tùy chọn) |

### Frontend (`frontend/`)
| Tên biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Địa chỉ REST API của Backend Gateway Manager |

---

## 6. Cấu trúc thư mục dự án

```text
KongManager/
├── backend/                        # Mã nguồn Go Backend
│   ├── cmd/api/main.go             # Entry point & tự động chạy migration
│   ├── internal/
│   │   ├── delivery/http/          # HTTP Handlers, Routers & Middlewares
│   │   │   ├── handlers/           # kong_handler.go, cluster_handler.go
│   │   │   ├── middlewares/        # cluster_id.go, CORS
│   │   │   └── router/             # router.go
│   │   ├── domain/                 # Models & Interfaces (Kong, Audit, Cluster)
│   │   ├── infrastructure/kong/    # Kong REST Admin API HTTP Client
│   │   ├── repository/             # Tương tác PostgreSQL (Clusters, Audit)
│   │   └── usecase/                # Business logic, decK diff & sync, promote
│   ├── Dockerfile                  # Containerfile cho Backend
│   └── go.mod
├── frontend/                       # Mã nguồn Next.js 16 Frontend
│   ├── src/
│   │   ├── app/                    # Next.js App Router Pages
│   │   │   ├── audit-logs/         # Nhật ký kiểm toán audit
│   │   │   ├── certificates/       # Quản lý chứng chỉ & cảnh báo SSL
│   │   │   ├── consumers/          # Consumers, API Keys, JWT, ACL
│   │   │   ├── dashboard/          # Golden Signals & tổng quan
│   │   │   ├── declarative/        # decK GitOps, Dry-run diff, Snapshots
│   │   │   ├── plugins/            # Danh mục Plugins
│   │   │   ├── routes/             # Cấu hình Route & kiểm tra xung đột
│   │   │   ├── services/           # Backend Services & phân cấp Owner
│   │   │   ├── settings/clusters/  # Quản lý đa cụm Kong
│   │   │   ├── topology/           # Sơ đồ trực quan luồng kiến trúc
│   │   │   └── upstreams/          # Upstream pools & Targets health checks
│   │   ├── components/             # Reusable UI & Business components
│   │   ├── lib/                    # Axios API client & helpers
│   │   ├── store/                  # Zustand state stores (cluster, auth)
│   │   └── types/                  # TypeScript interface definitions
│   ├── Dockerfile                  # Containerfile tối ưu hóa build tĩnh
│   ├── package.json
│   └── vitest.config.ts            # Cấu hình kiểm thử Frontend
├── deploy/                         # Công cụ triển khai Production
│   ├── docker-compose.yml          # Full stack container configuration
│   ├── k8s/                        # Kubernetes manifests
│   └── scripts/                    # Shell & PowerShell deployment scripts
├── docs/                           # Tài liệu đặc tả phân tích kiến trúc
│   ├── Gateway_Manager_Production_Analysis.docx
│   └── Gateway_Manager_Experiment_Analysis.docx
└── README.md                       # Tài liệu hướng dẫn sử dụng
```

---

## 7. Kiểm thử & Đảm bảo chất lượng (QA & Testing)

Dự án áp dụng bộ kiểm thử tự động toàn diện cho cả Backend và Frontend:

### Kiểm thử Backend (Go Unit Tests)
```bash
cd backend
go test -v ./...
```

### Kiểm thử Frontend (Vitest & React Testing Library)
```bash
cd frontend
# Chạy bộ test unit/component
npm test

# Chạy kiểm tra tĩnh Typescript (Type checking)
npx tsc --noEmit

# Kiểm tra quy trình đóng gói Production Build
npm run build
```

---

## 8. Quy trình CI/CD & Triển khai tự động (CI/CD Pipeline)

Dự án thiết lập chuỗi tự động hóa CI/CD khép kín, chuẩn Production sử dụng **GitHub Actions**, **GitHub Container Registry (GHCR)** và **Aqua Security Trivy**:

```mermaid
flowchart LR
    Dev([Developer]) -->|Git Push / PR| GH[GitHub Actions]
    
    subgraph CI["1. Continuous Integration (ci.yml)"]
        BE_CI["Backend: gofmt, vet, unit tests, build"]
        FE_CI["Frontend: tsc, eslint, vitest, next build"]
        VAL["Manifests: docker compose & k8s syntax"]
        GATE{"Quality Gate\nStatus Check"}
        BE_CI --> GATE
        FE_CI --> GATE
        VAL --> GATE
    end

    subgraph CD_REG["2. Delivery & Security (docker-publish.yml)"]
        DOCKER_BUILD["Docker Buildx (Multi-Arch)"]
        TRIVY["Trivy Security Scan\n(CVEs High/Critical)"]
        GHCR[("GHCR Registry\nghcr.io")]
        DOCKER_BUILD --> TRIVY --> GHCR
    end

    subgraph CD_DEPLOY["3. Deployment (cd-deploy.yml)"]
        ENV_CHOICE{"Environment\n(STG / PROD)"}
        SSH_COMPOSE["Docker Compose Host\n(SSH + Rolling Update + Health Check)"]
        K8S_DEPLOY["Kubernetes Cluster\n(kubectl rollout + Auto Rollback)"]
        ENV_CHOICE --> SSH_COMPOSE
        ENV_CHOICE --> K8S_DEPLOY
    end

    GH --> CI
    GATE -->|On Merge / Tag| CD_REG
    CD_REG -->|Trigger / Manual Dispatch| CD_DEPLOY
```

### Các Workflows trong `.github/workflows/`

| Workflow | Tập tin | Kích hoạt (Trigger) | Nhiệm vụ chính |
| :--- | :--- | :--- | :--- |
| **CI - Quality Gate** | [ci.yml](file:///.github/workflows/ci.yml) | `push` / `pull_request` (`master`, `main`), `workflow_dispatch` | • Go format check (`gofmt`), static analysis (`go vet`)<br>• Backend Unit Tests + Coverage report<br>• TypeScript type checking (`tsc`) & ESLint 9<br>• Frontend Vitest unit/component tests<br>• Next.js Production Build verification<br>• Kiểm tra cú pháp `docker-compose.yml` & k8s manifests |
| **Publish Containers** | [docker-publish.yml](file:///.github/workflows/docker-publish.yml) | `push` (`master`, `main`), Tags `v*.*.*`, `workflow_dispatch` | • Đóng gói Docker Backend & Frontend với cache `type=gha`<br>• Quét lỗ hổng bảo mật với Aqua Trivy (High/Critical CVEs)<br>• Xuất bản Container Images lên GitHub Packages (`ghcr.io`)<br>• Tự động tạo GitHub Release & Changelog khi push Git Tag |
| **CD - Deployment** | [cd-deploy.yml](file:///.github/workflows/cd-deploy.yml) | `workflow_dispatch` (Chọn môi trường: `staging` / `production`) | • Triển khai qua Docker Compose (SSH pull, rolling restart, verify `/health`)<br>• Triển khai qua Kubernetes (`kubectl rollout status` + tự động Rollback `rollout undo` nếu có sự cố) |

### Kiểm tra CI cục bộ trước khi Push (Local Quality Gate)

Để đảm bảo Pull Request vượt qua mọi bài test của CI, chạy trực tiếp script kiểm tra toàn diện:

- **Trên Linux / macOS**:
  ```bash
  chmod +x deploy/scripts/ci-local.sh
  ./deploy/scripts/ci-local.sh
  ```
- **Trên Windows (PowerShell)**:
  ```powershell
  .\deploy\scripts\ci-local.ps1
  ```

### Cấu hình Secrets trên GitHub Repository

Để sử dụng quy trình CD tự động ([cd-deploy.yml](file:///.github/workflows/cd-deploy.yml)), cấu hình các Secrets sau tại **Settings > Secrets and variables > Actions**:

| Secret Name | Áp dụng cho | Mục đích |
| :--- | :--- | :--- |
| `DEPLOY_SSH_HOST` | Docker Compose (SSH) | Địa chỉ IP hoặc hostname của server máy chủ |
| `DEPLOY_SSH_USER` | Docker Compose (SSH) | Tên người dùng SSH (ví dụ: `ubuntu`, `deployer`) |
| `DEPLOY_SSH_KEY` | Docker Compose (SSH) | SSH Private Key có quyền truy cập máy chủ |
| `DEPLOY_SSH_PORT` | Docker Compose (SSH) | Cổng SSH (mặc định: `22`) |
| `DEPLOY_PATH` | Docker Compose (SSH) | Thư mục chứa mã nguồn/compose trên máy chủ (ví dụ: `/opt/kong-manager`) |
| `KUBECONFIG` | Kubernetes Deploy | Nội dung file kubeconfig để xác thực với cụm k8s |

---

## 9. Đóng góp & Bản quyền

Dự án được xây dựng và phát triển theo giấy phép [MIT License](LICENSE). Mọi đóng góp, phản hồi lỗi hoặc đề xuất tính năng vui lòng tạo Pull Request hoặc Issue trên GitHub repository.
