package domain

import "context"

type KongService struct {
	ID                string               `json:"id,omitempty"`
	Name              string               `json:"name"`
	Protocol          string               `json:"protocol"`
	Host              string               `json:"host"`
	Port              int                  `json:"port"`
	Path              string               `json:"path,omitempty"`
	Retries           int                  `json:"retries,omitempty"`
	ConnectTimeout    int                  `json:"connect_timeout,omitempty"`
	WriteTimeout      int                  `json:"write_timeout,omitempty"`
	ReadTimeout       int                  `json:"read_timeout,omitempty"`
	URL               string               `json:"url,omitempty"`
	TLSVerify         *bool                `json:"tls_verify,omitempty"`
	TLSVerifyDepth    *int                 `json:"tls_verify_depth,omitempty"`
	CACertificates    []string             `json:"ca_certificates,omitempty"`
	ClientCertificate *KongRouteServiceRef `json:"client_certificate,omitempty"`
	Enabled           *bool                `json:"enabled,omitempty"`
	Tags              []string             `json:"tags,omitempty"`
}

type KongRouteServiceRef struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
}

type KongRoute struct {
	ID                      string                 `json:"id,omitempty"`
	Name                    string                 `json:"name,omitempty"`
	Protocols               []string               `json:"protocols"`
	Methods                 []string               `json:"methods,omitempty"`
	Hosts                   []string               `json:"hosts,omitempty"`
	Paths                   []string               `json:"paths,omitempty"`
	Headers                 map[string][]string    `json:"headers,omitempty"`
	SNIs                    []string               `json:"snis,omitempty"`
	Sources                 []interface{}          `json:"sources,omitempty"`
	Destinations            []interface{}          `json:"destinations,omitempty"`
	StripPath               bool                   `json:"strip_path,omitempty"`
	PreserveHost            bool                   `json:"preserve_host,omitempty"`
	RegexPriority           int                    `json:"regex_priority,omitempty"`
	PathHandling            string                 `json:"path_handling,omitempty"`
	HTTPSRedirectStatusCode int                    `json:"https_redirect_status_code,omitempty"`
	RequestBuffering        *bool                  `json:"request_buffering,omitempty"`
	ResponseBuffering       *bool                  `json:"response_buffering,omitempty"`
	Service                 *KongRouteServiceRef   `json:"service,omitempty"`
	Tags                    []string               `json:"tags,omitempty"`
}

type KongConsumer struct {
	ID       string   `json:"id,omitempty"`
	Username string   `json:"username,omitempty"`
	CustomID string   `json:"custom_id,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

type KongKeyAuth struct {
	ID        string               `json:"id,omitempty"`
	Key       string               `json:"key,omitempty"`
	Consumer  *KongRouteServiceRef `json:"consumer,omitempty"`
	CreatedAt int64                `json:"created_at,omitempty"`
	Tags      []string             `json:"tags,omitempty"`
}

type KongJWT struct {
	ID           string               `json:"id,omitempty"`
	Key          string               `json:"key,omitempty"`
	Secret       string               `json:"secret,omitempty"`
	Algorithm    string               `json:"algorithm,omitempty"`
	RSAPublicKey string               `json:"rsa_public_key,omitempty"`
	Consumer     *KongRouteServiceRef `json:"consumer,omitempty"`
	CreatedAt    int64                `json:"created_at,omitempty"`
	Tags         []string             `json:"tags,omitempty"`
}

type KongBasicAuth struct {
	ID        string               `json:"id,omitempty"`
	Username  string               `json:"username,omitempty"`
	Password  string               `json:"password,omitempty"`
	Consumer  *KongRouteServiceRef `json:"consumer,omitempty"`
	CreatedAt int64                `json:"created_at,omitempty"`
	Tags      []string             `json:"tags,omitempty"`
}

type KongACL struct {
	ID        string               `json:"id,omitempty"`
	Group     string               `json:"group,omitempty"`
	Consumer  *KongRouteServiceRef `json:"consumer,omitempty"`
	CreatedAt int64                `json:"created_at,omitempty"`
	Tags      []string             `json:"tags,omitempty"`
}

type KongPlugin struct {
	ID        string                 `json:"id,omitempty"`
	Name      string                 `json:"name"`
	Enabled   bool                   `json:"enabled"`
	Config    map[string]interface{} `json:"config"`
	Service   *KongRouteServiceRef   `json:"service,omitempty"`
	Route     *KongRouteServiceRef   `json:"route,omitempty"`
	Consumer  *KongRouteServiceRef   `json:"consumer,omitempty"`
	Protocols []string               `json:"protocols,omitempty"`
	Tags      []string               `json:"tags,omitempty"`
}

type KongHealthStatus struct {
	Interval     int   `json:"interval,omitempty"`
	Successes    int   `json:"successes,omitempty"`
	HTTPStatuses []int `json:"http_statuses,omitempty"`
}

type KongUnhealthStatus struct {
	Interval     int   `json:"interval,omitempty"`
	HTTPFailures int   `json:"http_failures,omitempty"`
	TCPFailures  int   `json:"tcp_failures,omitempty"`
	Timeouts     int   `json:"timeouts,omitempty"`
	HTTPStatuses []int `json:"http_statuses,omitempty"`
}

type KongActiveHealthcheck struct {
	Type                   string              `json:"type,omitempty"`
	HTTPPath               string              `json:"http_path,omitempty"`
	Timeout                float64             `json:"timeout,omitempty"`
	Concurrency            int                 `json:"concurrency,omitempty"`
	HTTPSVerifyCertificate *bool               `json:"https_verify_certificate,omitempty"`
	HTTPSNI                string              `json:"https_sni,omitempty"`
	Healthy                *KongHealthStatus   `json:"healthy,omitempty"`
	Unhealthy              *KongUnhealthStatus `json:"unhealthy,omitempty"`
}

type KongPassiveHealthcheck struct {
	Type      string              `json:"type,omitempty"`
	Healthy   *KongHealthStatus   `json:"healthy,omitempty"`
	Unhealthy *KongUnhealthStatus `json:"unhealthy,omitempty"`
}

type KongHealthchecks struct {
	Active    *KongActiveHealthcheck  `json:"active,omitempty"`
	Passive   *KongPassiveHealthcheck `json:"passive,omitempty"`
	Threshold float64                 `json:"threshold,omitempty"`
}

type KongUpstream struct {
	ID           string            `json:"id,omitempty"`
	Name         string            `json:"name"`
	Algorithm    string            `json:"algorithm,omitempty"`
	Slots        int               `json:"slots,omitempty"`
	HashOn       string            `json:"hash_on,omitempty"`
	HashFallback string            `json:"hash_fallback,omitempty"`
	HashOnHeader string            `json:"hash_on_header,omitempty"`
	HashOnCookie string            `json:"hash_on_cookie,omitempty"`
	Healthchecks *KongHealthchecks `json:"healthchecks,omitempty"`
	Tags         []string          `json:"tags,omitempty"`
	CreatedAt    int64             `json:"created_at,omitempty"`
}

type KongTargetRef struct {
	ID string `json:"id,omitempty"`
}

type KongTarget struct {
	ID        string         `json:"id,omitempty"`
	Target    string         `json:"target"`
	Weight    int            `json:"weight"`
	Upstream  *KongTargetRef `json:"upstream,omitempty"`
	Tags      []string       `json:"tags,omitempty"`
	CreatedAt float64        `json:"created_at,omitempty"`
}

type KongTargetHealth struct {
	ID        string                 `json:"id"`
	CreatedAt float64                `json:"created_at"`
	Target    string                 `json:"target"`
	Weight    int                    `json:"weight"`
	Health    string                 `json:"health"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

type KongUpstreamHealth struct {
	Total  int                `json:"total"`
	NodeID string             `json:"node_id"`
	Data   []KongTargetHealth `json:"data"`
}

type KongCertificate struct {
	ID              string               `json:"id,omitempty"`
	Cert            string               `json:"cert"`
	Key             string               `json:"key"`
	CertAlt         string               `json:"cert_alt,omitempty"`
	KeyAlt          string               `json:"key_alt,omitempty"`
	SNIs            []string             `json:"snis,omitempty"`
	Tags            []string             `json:"tags,omitempty"`
	CreatedAt       int64                `json:"created_at,omitempty"`
	ExpiryDate      string               `json:"expiry_date,omitempty"`
	DaysUntilExpiry int                  `json:"days_until_expiry,omitempty"`
	IsExpired       bool                 `json:"is_expired,omitempty"`
	Issuer          string               `json:"issuer,omitempty"`
	Subject         string               `json:"subject,omitempty"`
}

type KongSNI struct {
	ID          string               `json:"id,omitempty"`
	Name        string               `json:"name"`
	Certificate *KongRouteServiceRef `json:"certificate,omitempty"`
	Tags        []string             `json:"tags,omitempty"`
	CreatedAt   int64                `json:"created_at,omitempty"`
}

type KongCACertificate struct {
	ID         string   `json:"id,omitempty"`
	Cert       string   `json:"cert"`
	CertDigest string   `json:"cert_digest,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	CreatedAt  int64    `json:"created_at,omitempty"`
}

type KongStatusServer struct {
	TotalRequests       int64 `json:"total_requests"`
	ConnectionsActive   int64 `json:"connections_active"`
	ConnectionsReading  int64 `json:"connections_reading"`
	ConnectionsWriting  int64 `json:"connections_writing"`
	ConnectionsWaiting  int64 `json:"connections_waiting"`
	ConnectionsAccepted int64 `json:"connections_accepted"`
	ConnectionsHandled  int64 `json:"connections_handled"`
}

type KongStatusDatabase struct {
	Reachable bool `json:"reachable"`
}

type KongStatus struct {
	Server            KongStatusServer   `json:"server"`
	Database          KongStatusDatabase `json:"database"`
	ConfigurationHash string             `json:"configuration_hash,omitempty"`
}

type KongNodeInfo struct {
	Hostname      string                 `json:"hostname"`
	Version       string                 `json:"version"`
	LuaVersion    string                 `json:"lua_version"`
	Tagline       string                 `json:"tagline"`
	Plugins       map[string]interface{} `json:"plugins"`
	Configuration map[string]interface{} `json:"configuration,omitempty"`
	Topology      string                 `json:"topology,omitempty"` // "traditional", "db_less", "hybrid_cp", "hybrid_dp"
}

type KongClient interface {
	// Services
	ListServices(ctx context.Context, clusterURL, token string) ([]KongService, error)
	GetService(ctx context.Context, clusterURL, token, serviceID string) (*KongService, error)
	CreateService(ctx context.Context, clusterURL, token string, svc *KongService) (*KongService, error)
	UpdateService(ctx context.Context, clusterURL, token string, svc *KongService) (*KongService, error)
	DeleteService(ctx context.Context, clusterURL, token, serviceID string) error

	// Routes
	ListRoutes(ctx context.Context, clusterURL, token string) ([]KongRoute, error)
	CreateRoute(ctx context.Context, clusterURL, token string, route *KongRoute) (*KongRoute, error)
	UpdateRoute(ctx context.Context, clusterURL, token string, route *KongRoute) (*KongRoute, error)
	DeleteRoute(ctx context.Context, clusterURL, token, routeID string) error

	// Consumers
	ListConsumers(ctx context.Context, clusterURL, token string) ([]KongConsumer, error)
	CreateConsumer(ctx context.Context, clusterURL, token string, consumer *KongConsumer) (*KongConsumer, error)
	UpdateConsumer(ctx context.Context, clusterURL, token string, consumer *KongConsumer) (*KongConsumer, error)
	DeleteConsumer(ctx context.Context, clusterURL, token, consumerID string) error

	// Consumer Credentials & ACL
	ListKeyAuths(ctx context.Context, clusterURL, token, consumerID string) ([]KongKeyAuth, error)
	CreateKeyAuth(ctx context.Context, clusterURL, token, consumerID string, keyAuth *KongKeyAuth) (*KongKeyAuth, error)
	DeleteKeyAuth(ctx context.Context, clusterURL, token, consumerID, keyID string) error

	ListJWTs(ctx context.Context, clusterURL, token, consumerID string) ([]KongJWT, error)
	CreateJWT(ctx context.Context, clusterURL, token, consumerID string, jwt *KongJWT) (*KongJWT, error)
	DeleteJWT(ctx context.Context, clusterURL, token, consumerID, jwtID string) error

	ListBasicAuths(ctx context.Context, clusterURL, token, consumerID string) ([]KongBasicAuth, error)
	CreateBasicAuth(ctx context.Context, clusterURL, token, consumerID string, basicAuth *KongBasicAuth) (*KongBasicAuth, error)
	DeleteBasicAuth(ctx context.Context, clusterURL, token, consumerID, authID string) error

	ListACLs(ctx context.Context, clusterURL, token, consumerID string) ([]KongACL, error)
	CreateACL(ctx context.Context, clusterURL, token, consumerID string, acl *KongACL) (*KongACL, error)
	DeleteACL(ctx context.Context, clusterURL, token, consumerID, aclID string) error

	// Plugins
	ListPlugins(ctx context.Context, clusterURL, token string) ([]KongPlugin, error)
	CreatePlugin(ctx context.Context, clusterURL, token string, plugin *KongPlugin) (*KongPlugin, error)
	UpdatePlugin(ctx context.Context, clusterURL, token string, plugin *KongPlugin) (*KongPlugin, error)
	DeletePlugin(ctx context.Context, clusterURL, token, pluginID string) error

	// Upstreams
	ListUpstreams(ctx context.Context, clusterURL, token string) ([]KongUpstream, error)
	GetUpstream(ctx context.Context, clusterURL, token, upstreamID string) (*KongUpstream, error)
	CreateUpstream(ctx context.Context, clusterURL, token string, upstream *KongUpstream) (*KongUpstream, error)
	UpdateUpstream(ctx context.Context, clusterURL, token string, upstream *KongUpstream) (*KongUpstream, error)
	DeleteUpstream(ctx context.Context, clusterURL, token, upstreamID string) error
	GetUpstreamHealth(ctx context.Context, clusterURL, token, upstreamID string) (*KongUpstreamHealth, error)

	// Targets
	ListTargets(ctx context.Context, clusterURL, token, upstreamID string) ([]KongTarget, error)
	CreateTarget(ctx context.Context, clusterURL, token, upstreamID string, target *KongTarget) (*KongTarget, error)
	DeleteTarget(ctx context.Context, clusterURL, token, upstreamID, targetID string) error
	SetTargetHealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error
	SetTargetUnhealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error

	// Certificates & SNIs & CA Certificates
	ListCertificates(ctx context.Context, clusterURL, token string) ([]KongCertificate, error)
	CreateCertificate(ctx context.Context, clusterURL, token string, cert *KongCertificate) (*KongCertificate, error)
	UpdateCertificate(ctx context.Context, clusterURL, token string, cert *KongCertificate) (*KongCertificate, error)
	DeleteCertificate(ctx context.Context, clusterURL, token, certID string) error

	ListSNIs(ctx context.Context, clusterURL, token string) ([]KongSNI, error)
	CreateSNI(ctx context.Context, clusterURL, token string, sni *KongSNI) (*KongSNI, error)
	DeleteSNI(ctx context.Context, clusterURL, token, sniName string) error

	ListCACertificates(ctx context.Context, clusterURL, token string) ([]KongCACertificate, error)
	CreateCACertificate(ctx context.Context, clusterURL, token string, caCert *KongCACertificate) (*KongCACertificate, error)
	DeleteCACertificate(ctx context.Context, clusterURL, token, caCertID string) error

	// Gateway Status & Node
	GetStatus(ctx context.Context, clusterURL, token string) (*KongStatus, error)
	GetNodeInfo(ctx context.Context, clusterURL, token string) (*KongNodeInfo, error)
}

type KongUsecase interface {
	// Services
	ListServices(ctx context.Context, clusterID int32) ([]KongService, error)
	CreateService(ctx context.Context, clusterID int32, svc *KongService) (*KongService, error)
	UpdateService(ctx context.Context, clusterID int32, svc *KongService) (*KongService, error)
	DeleteService(ctx context.Context, clusterID int32, serviceID string) error

	// Routes
	ListRoutes(ctx context.Context, clusterID int32) ([]KongRoute, error)
	CreateRoute(ctx context.Context, clusterID int32, route *KongRoute) (*KongRoute, error)
	UpdateRoute(ctx context.Context, clusterID int32, route *KongRoute) (*KongRoute, error)
	DeleteRoute(ctx context.Context, clusterID int32, routeID string) error

	// Consumers
	ListConsumers(ctx context.Context, clusterID int32) ([]KongConsumer, error)
	CreateConsumer(ctx context.Context, clusterID int32, consumer *KongConsumer) (*KongConsumer, error)
	UpdateConsumer(ctx context.Context, clusterID int32, consumer *KongConsumer) (*KongConsumer, error)
	DeleteConsumer(ctx context.Context, clusterID int32, consumerID string) error

	// Consumer Credentials & ACL
	ListKeyAuths(ctx context.Context, clusterID int32, consumerID string) ([]KongKeyAuth, error)
	CreateKeyAuth(ctx context.Context, clusterID int32, consumerID string, keyAuth *KongKeyAuth) (*KongKeyAuth, error)
	DeleteKeyAuth(ctx context.Context, clusterID int32, consumerID, keyID string) error

	ListJWTs(ctx context.Context, clusterID int32, consumerID string) ([]KongJWT, error)
	CreateJWT(ctx context.Context, clusterID int32, consumerID string, jwt *KongJWT) (*KongJWT, error)
	DeleteJWT(ctx context.Context, clusterID int32, consumerID, jwtID string) error

	ListBasicAuths(ctx context.Context, clusterID int32, consumerID string) ([]KongBasicAuth, error)
	CreateBasicAuth(ctx context.Context, clusterID int32, consumerID string, basicAuth *KongBasicAuth) (*KongBasicAuth, error)
	DeleteBasicAuth(ctx context.Context, clusterID int32, consumerID, authID string) error

	ListACLs(ctx context.Context, clusterID int32, consumerID string) ([]KongACL, error)
	CreateACL(ctx context.Context, clusterID int32, consumerID string, acl *KongACL) (*KongACL, error)
	DeleteACL(ctx context.Context, clusterID int32, consumerID, aclID string) error

	// Plugins
	ListPlugins(ctx context.Context, clusterID int32) ([]KongPlugin, error)
	CreatePlugin(ctx context.Context, clusterID int32, plugin *KongPlugin) (*KongPlugin, error)
	UpdatePlugin(ctx context.Context, clusterID int32, plugin *KongPlugin) (*KongPlugin, error)
	DeletePlugin(ctx context.Context, clusterID int32, pluginID string) error

	// Upstreams
	ListUpstreams(ctx context.Context, clusterID int32) ([]KongUpstream, error)
	CreateUpstream(ctx context.Context, clusterID int32, upstream *KongUpstream) (*KongUpstream, error)
	UpdateUpstream(ctx context.Context, clusterID int32, upstream *KongUpstream) (*KongUpstream, error)
	DeleteUpstream(ctx context.Context, clusterID int32, upstreamID string) error
	GetUpstreamHealth(ctx context.Context, clusterID int32, upstreamID string) (*KongUpstreamHealth, error)

	// Targets
	ListTargets(ctx context.Context, clusterID int32, upstreamID string) ([]KongTarget, error)
	CreateTarget(ctx context.Context, clusterID int32, upstreamID string, target *KongTarget) (*KongTarget, error)
	DeleteTarget(ctx context.Context, clusterID int32, upstreamID, targetID string) error
	SetTargetHealthy(ctx context.Context, clusterID int32, upstreamID, targetID string) error
	SetTargetUnhealthy(ctx context.Context, clusterID int32, upstreamID, targetID string) error

	// Certificates & SNIs & CA Certificates
	ListCertificates(ctx context.Context, clusterID int32) ([]KongCertificate, error)
	CreateCertificate(ctx context.Context, clusterID int32, cert *KongCertificate) (*KongCertificate, error)
	UpdateCertificate(ctx context.Context, clusterID int32, cert *KongCertificate) (*KongCertificate, error)
	DeleteCertificate(ctx context.Context, clusterID int32, certID string) error

	ListSNIs(ctx context.Context, clusterID int32) ([]KongSNI, error)
	CreateSNI(ctx context.Context, clusterID int32, sni *KongSNI) (*KongSNI, error)
	DeleteSNI(ctx context.Context, clusterID int32, sniName string) error

	ListCACertificates(ctx context.Context, clusterID int32) ([]KongCACertificate, error)
	CreateCACertificate(ctx context.Context, clusterID int32, caCert *KongCACertificate) (*KongCACertificate, error)
	DeleteCACertificate(ctx context.Context, clusterID int32, caCertID string) error

	// Gateway Status & Node
	GetStatus(ctx context.Context, clusterID int32) (*KongStatus, error)
	GetNodeInfo(ctx context.Context, clusterID int32) (*KongNodeInfo, error)

	// Declarative GitOps & Snapshots
	DumpDeclarativeConfig(ctx context.Context, clusterID int32) (*KongDeclarativeConfig, error)
	DiffDeclarativeConfig(ctx context.Context, clusterID int32, config *KongDeclarativeConfig) (*KongDiffSummary, error)
	SyncDeclarativeConfig(ctx context.Context, clusterID int32, config *KongDeclarativeConfig) (*KongDiffSummary, error)
	CreateSnapshot(ctx context.Context, clusterID int32, name, description string) (*Snapshot, error)
	ListSnapshots(ctx context.Context, clusterID int32) ([]Snapshot, error)
	RestoreSnapshot(ctx context.Context, clusterID int32, snapshotID int64) (*KongDiffSummary, error)
	DeleteSnapshot(ctx context.Context, snapshotID int64) error

	// Operational Diagnostics & Request Testing
	TestRequest(ctx context.Context, clusterID int32, req *TestRequestInput) (*TestRequestResult, error)
	RunDiagnostics(ctx context.Context, clusterID int32, input *DiagnosticsInput) (*DiagnosticsResult, error)

	// Environment Promotion (DEV -> STG -> PROD)
	PromoteConfig(ctx context.Context, sourceClusterID, targetClusterID int32) (*KongDiffSummary, error)
}

type DiagnosticsInput struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"` // "tcp", "tls", "http", "https"
	Path     string `json:"path,omitempty"`
	Timeout  int    `json:"timeout,omitempty"` // Seconds
}

type DiagnosticsStep struct {
	Step      string  `json:"step"`   // "DNS", "TCP_CONNECT", "TLS_HANDSHAKE", "HTTP_PROBE"
	Status    string  `json:"status"` // "SUCCESS", "FAILED", "SKIPPED"
	Message   string  `json:"message"`
	LatencyMS float64 `json:"latency_ms"`
}

type DiagnosticsResult struct {
	Target  string            `json:"target"`
	Success bool              `json:"success"`
	TotalMS float64           `json:"total_ms"`
	Steps   []DiagnosticsStep `json:"steps"`
	Error   string            `json:"error,omitempty"`
}

type TestRequestInput struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"` // Proxy URL or path
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
	Timeout int               `json:"timeout,omitempty"` // Seconds
}

type TestRequestResult struct {
	StatusCode int                 `json:"status_code"`
	StatusText string              `json:"status_text"`
	LatencyMS  float64             `json:"latency_ms"`
	Headers    map[string][]string `json:"headers"`
	Body       string              `json:"body"`
	SizeBytes  int64               `json:"size_bytes"`
}

type KongDeclarativeConsumer struct {
	Username             string          `json:"username,omitempty" yaml:"username,omitempty"`
	CustomID             string          `json:"custom_id,omitempty" yaml:"custom_id,omitempty"`
	Tags                 []string        `json:"tags,omitempty" yaml:"tags,omitempty"`
	KeyAuthCredentials   []KongKeyAuth   `json:"keyauth_credentials,omitempty" yaml:"keyauth_credentials,omitempty"`
	JWTCredentials       []KongJWT       `json:"jwt_secrets,omitempty" yaml:"jwt_secrets,omitempty"`
	BasicAuthCredentials []KongBasicAuth `json:"basicauth_credentials,omitempty" yaml:"basicauth_credentials,omitempty"`
	ACLs                 []KongACL       `json:"acls,omitempty" yaml:"acls,omitempty"`
}

type KongDeclarativeUpstream struct {
	Name         string            `json:"name" yaml:"name"`
	Algorithm    string            `json:"algorithm,omitempty" yaml:"algorithm,omitempty"`
	Slots        int               `json:"slots,omitempty" yaml:"slots,omitempty"`
	HashOn       string            `json:"hash_on,omitempty" yaml:"hash_on,omitempty"`
	HashFallback string            `json:"hash_fallback,omitempty" yaml:"hash_fallback,omitempty"`
	HashOnHeader string            `json:"hash_on_header,omitempty" yaml:"hash_on_header,omitempty"`
	HashOnCookie string            `json:"hash_on_cookie,omitempty" yaml:"hash_on_cookie,omitempty"`
	Healthchecks *KongHealthchecks `json:"healthchecks,omitempty" yaml:"healthchecks,omitempty"`
	Tags         []string          `json:"tags,omitempty" yaml:"tags,omitempty"`
	Targets      []KongTarget      `json:"targets,omitempty" yaml:"targets,omitempty"`
}

type KongDeclarativeService struct {
	Name              string               `json:"name" yaml:"name"`
	Protocol          string               `json:"protocol" yaml:"protocol"`
	Host              string               `json:"host" yaml:"host"`
	Port              int                  `json:"port" yaml:"port"`
	Path              string               `json:"path,omitempty" yaml:"path,omitempty"`
	Retries           int                  `json:"retries,omitempty" yaml:"retries,omitempty"`
	ConnectTimeout    int                  `json:"connect_timeout,omitempty" yaml:"connect_timeout,omitempty"`
	WriteTimeout      int                  `json:"write_timeout,omitempty" yaml:"write_timeout,omitempty"`
	ReadTimeout       int                  `json:"read_timeout,omitempty" yaml:"read_timeout,omitempty"`
	URL               string               `json:"url,omitempty" yaml:"url,omitempty"`
	Enabled           *bool                `json:"enabled,omitempty" yaml:"enabled,omitempty"`
	Tags              []string             `json:"tags,omitempty" yaml:"tags,omitempty"`
	Routes            []KongRoute          `json:"routes,omitempty" yaml:"routes,omitempty"`
	Plugins           []KongPlugin         `json:"plugins,omitempty" yaml:"plugins,omitempty"`
}

type KongDeclarativeConfig struct {
	FormatVersion  string                    `json:"_format_version" yaml:"_format_version"`
	Transform      *bool                     `json:"_transform,omitempty" yaml:"_transform,omitempty"`
	Services       []KongDeclarativeService  `json:"services,omitempty" yaml:"services,omitempty"`
	Routes         []KongRoute               `json:"routes,omitempty" yaml:"routes,omitempty"`
	Upstreams      []KongDeclarativeUpstream `json:"upstreams,omitempty" yaml:"upstreams,omitempty"`
	Consumers      []KongDeclarativeConsumer `json:"consumers,omitempty" yaml:"consumers,omitempty"`
	Plugins        []KongPlugin              `json:"plugins,omitempty" yaml:"plugins,omitempty"`
	Certificates   []KongCertificate         `json:"certificates,omitempty" yaml:"certificates,omitempty"`
	CACertificates []KongCACertificate       `json:"ca_certificates,omitempty" yaml:"ca_certificates,omitempty"`
}

type KongDiffSummary struct {
	ServicesToCreate     int `json:"services_to_create"`
	RoutesToCreate       int `json:"routes_to_create"`
	UpstreamsToCreate    int `json:"upstreams_to_create"`
	TargetsToCreate      int `json:"targets_to_create"`
	ConsumersToCreate    int `json:"consumers_to_create"`
	CredentialsToCreate  int `json:"credentials_to_create"`
	PluginsToCreate      int `json:"plugins_to_create"`
	CertificatesToCreate int `json:"certificates_to_create"`
}
