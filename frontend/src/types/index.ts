export interface KongCluster {
  id: number;
  name: string;
  url: string;
  admin_token?: string;
  environment?: 'DEV' | 'STG' | 'PROD';
  created_at?: string;
  updated_at?: string;
}

export interface KongService {
  id: string;
  name: string;
  protocol: string;
  host: string;
  port: number;
  path?: string;
  retries?: number;
  connect_timeout?: number;
  write_timeout?: number;
  read_timeout?: number;
  url?: string;
  tls_verify?: boolean | null;
  tls_verify_depth?: number | null;
  ca_certificates?: string[];
  client_certificate?: { id: string };
  enabled?: boolean;
  tags?: string[];
  created_at?: number;
  updated_at?: number;
}

export interface KongRoute {
  id: string;
  name: string;
  protocols: string[];
  methods?: string[];
  hosts?: string[];
  paths?: string[];
  headers?: Record<string, string[]>;
  snis?: string[];
  sources?: Array<{ ip?: string; port?: number }>;
  destinations?: Array<{ ip?: string; port?: number }>;
  strip_path?: boolean;
  preserve_host?: boolean;
  regex_priority?: number;
  path_handling?: 'v0' | 'v1';
  https_redirect_status_code?: number;
  request_buffering?: boolean;
  response_buffering?: boolean;
  service?: {
    id: string;
    name?: string;
  };
  tags?: string[];
  created_at?: number;
  updated_at?: number;
}

export interface KongConsumer {
  id: string;
  username?: string;
  custom_id?: string;
  tags?: string[];
  created_at?: number;
}

export interface KongKeyAuth {
  id: string;
  key: string;
  consumer?: { id: string };
  created_at?: number;
  tags?: string[];
}

export interface KongJWT {
  id: string;
  key: string;
  secret?: string;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256';
  rsa_public_key?: string;
  consumer?: { id: string };
  created_at?: number;
  tags?: string[];
}

export interface KongBasicAuth {
  id: string;
  username: string;
  password?: string;
  consumer?: { id: string };
  created_at?: number;
  tags?: string[];
}

export interface KongACL {
  id: string;
  group: string;
  consumer?: { id: string };
  created_at?: number;
  tags?: string[];
}

export interface KongPlugin {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  service?: { id: string };
  route?: { id: string };
  consumer?: { id: string };
  protocols?: string[];
  tags?: string[];
  created_at?: number;
}

export interface KongHealthStatus {
  interval?: number;
  successes?: number;
  http_statuses?: number[];
}

export interface KongUnhealthStatus {
  interval?: number;
  http_failures?: number;
  tcp_failures?: number;
  timeouts?: number;
  http_statuses?: number[];
}

export interface KongActiveHealthcheck {
  type?: 'http' | 'https' | 'tcp' | 'grpc' | 'grpcs';
  http_path?: string;
  timeout?: number;
  concurrency?: number;
  https_verify_certificate?: boolean;
  https_sni?: string;
  healthy?: KongHealthStatus;
  unhealthy?: KongUnhealthStatus;
}

export interface KongPassiveHealthcheck {
  type?: 'http' | 'https' | 'tcp' | 'grpc' | 'grpcs';
  healthy?: KongHealthStatus;
  unhealthy?: KongUnhealthStatus;
}

export interface KongHealthchecks {
  active?: KongActiveHealthcheck;
  passive?: KongPassiveHealthcheck;
  threshold?: number;
}

export interface KongCertificate {
  id: string;
  cert: string;
  key: string;
  cert_alt?: string;
  key_alt?: string;
  snis?: string[];
  tags?: string[];
  created_at?: number;
  expiry_date?: string;
  days_until_expiry?: number;
  is_expired?: boolean;
  issuer?: string;
  subject?: string;
}

export interface KongSNI {
  id: string;
  name: string;
  certificate?: { id: string };
  tags?: string[];
  created_at?: number;
}

export interface KongCACertificate {
  id: string;
  cert: string;
  cert_digest?: string;
  tags?: string[];
  created_at?: number;
}

export interface KongTarget {
  id: string;
  target: string;
  weight: number;
  upstream?: { id: string };
  tags?: string[];
  created_at?: number;
}

export interface KongTargetHealth {
  id: string;
  created_at: number;
  target: string;
  weight: number;
  health: 'HEALTHY' | 'UNHEALTHY' | 'DRAINED' | 'DNS_ERROR';
  data?: Record<string, any>;
}

export interface KongUpstreamHealth {
  total: number;
  node_id: string;
  data: KongTargetHealth[];
}

export interface KongUpstream {
  id: string;
  name: string;
  slots?: number;
  algorithm?: 'round-robin' | 'consistent-hashing' | 'least-connections' | 'latency';
  hash_on?: 'none' | 'consumer' | 'ip' | 'header' | 'cookie';
  hash_fallback?: 'none' | 'consumer' | 'ip' | 'header' | 'cookie';
  hash_on_header?: string;
  hash_on_cookie?: string;
  healthchecks?: KongHealthchecks;
  tags?: string[];
  created_at?: number;
}

export interface KongStatusServer {
  total_requests: number;
  connections_active: number;
  connections_reading: number;
  connections_writing: number;
  connections_waiting: number;
  connections_accepted: number;
  connections_handled: number;
}

export interface KongStatus {
  server: KongStatusServer;
  database: {
    reachable: boolean;
  };
  configuration_hash?: string;
}

export interface KongNodeInfo {
  hostname: string;
  version: string;
  lua_version: string;
  tagline: string;
  plugins: Record<string, any>;
  configuration?: Record<string, any>;
  topology?: 'traditional' | 'db_less' | 'hybrid_cp' | 'hybrid_dp';
}

export interface KongDeclarativeConsumer {
  username?: string;
  custom_id?: string;
  tags?: string[];
  keyauth_credentials?: KongKeyAuth[];
  jwt_secrets?: KongJWT[];
  basicauth_credentials?: KongBasicAuth[];
  acls?: KongACL[];
}

export interface KongDeclarativeUpstream {
  name: string;
  algorithm?: 'round-robin' | 'consistent-hashing' | 'least-connections' | 'latency';
  slots?: number;
  hash_on?: 'none' | 'consumer' | 'ip' | 'header' | 'cookie';
  hash_fallback?: 'none' | 'consumer' | 'ip' | 'header' | 'cookie';
  hash_on_header?: string;
  hash_on_cookie?: string;
  healthchecks?: KongHealthchecks;
  tags?: string[];
  targets?: KongTarget[];
}

export interface KongDeclarativeService {
  name: string;
  protocol: string;
  host: string;
  port: number;
  path?: string;
  retries?: number;
  connect_timeout?: number;
  write_timeout?: number;
  read_timeout?: number;
  url?: string;
  enabled?: boolean;
  tags?: string[];
  routes?: KongRoute[];
  plugins?: KongPlugin[];
}

export interface KongDeclarativeConfig {
  _format_version: string;
  _transform?: boolean;
  services?: KongDeclarativeService[];
  routes?: KongRoute[];
  upstreams?: KongDeclarativeUpstream[];
  consumers?: KongDeclarativeConsumer[];
  plugins?: KongPlugin[];
  certificates?: KongCertificate[];
  ca_certificates?: KongCACertificate[];
}

export interface KongDiffSummary {
  services_to_create: number;
  routes_to_create: number;
  upstreams_to_create: number;
  targets_to_create: number;
  consumers_to_create: number;
  credentials_to_create: number;
  plugins_to_create: number;
  certificates_to_create: number;
}

export interface KongSnapshot {
  id: number;
  cluster_id: number;
  name: string;
  description?: string;
  config_json?: KongDeclarativeConfig;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  sso_provider?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuditLog {
  id: number;
  cluster_id?: number;
  user_id?: number;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface TestRequestInput {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface TestRequestResult {
  status_code: number;
  status_text: string;
  latency_ms: number;
  headers: Record<string, string[]>;
  body: string;
  size_bytes: number;
}

export interface DiagnosticsStep {
  step: 'DNS' | 'TCP_CONNECT' | 'TLS_HANDSHAKE' | 'HTTP_PROBE';
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  message: string;
  latency_ms: number;
}

export interface DiagnosticsResult {
  target: string;
  success: boolean;
  total_ms: number;
  steps: DiagnosticsStep[];
  error?: string;
}

export interface DiagnosticsInput {
  host: string;
  port: number;
  protocol?: string;
  path?: string;
  timeout?: number;
}

