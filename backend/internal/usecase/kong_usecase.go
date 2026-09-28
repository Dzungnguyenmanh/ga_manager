package usecase

import (
	"context"
	"errors"

	"kong-manager-backend/internal/domain"
)

type kongUsecase struct {
	kongClient   domain.KongClient
	clusterRepo  domain.ClusterRepository
	snapshotRepo domain.SnapshotRepository
}

func NewKongUsecase(client domain.KongClient, repo domain.ClusterRepository, snapshotRepo domain.SnapshotRepository) domain.KongUsecase {
	return &kongUsecase{
		kongClient:   client,
		clusterRepo:  repo,
		snapshotRepo: snapshotRepo,
	}
}

func (u *kongUsecase) getClusterParams(ctx context.Context, clusterID int32) (string, string, error) {
	cluster, err := u.clusterRepo.GetByID(ctx, clusterID)
	if err != nil {
		return "", "", errors.New("cluster not found")
	}
	return cluster.URL, cluster.AdminToken, nil
}

// -------------------------------------------------------------
// Services
// -------------------------------------------------------------

func (u *kongUsecase) ListServices(ctx context.Context, clusterID int32) ([]domain.KongService, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListServices(ctx, url, token)
}

func (u *kongUsecase) CreateService(ctx context.Context, clusterID int32, svc *domain.KongService) (*domain.KongService, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateService(ctx, url, token, svc)
}

func (u *kongUsecase) UpdateService(ctx context.Context, clusterID int32, svc *domain.KongService) (*domain.KongService, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdateService(ctx, url, token, svc)
}

func (u *kongUsecase) DeleteService(ctx context.Context, clusterID int32, serviceID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteService(ctx, url, token, serviceID)
}

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

func (u *kongUsecase) ListRoutes(ctx context.Context, clusterID int32) ([]domain.KongRoute, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListRoutes(ctx, url, token)
}

func (u *kongUsecase) CreateRoute(ctx context.Context, clusterID int32, route *domain.KongRoute) (*domain.KongRoute, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateRoute(ctx, url, token, route)
}

func (u *kongUsecase) UpdateRoute(ctx context.Context, clusterID int32, route *domain.KongRoute) (*domain.KongRoute, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdateRoute(ctx, url, token, route)
}

func (u *kongUsecase) DeleteRoute(ctx context.Context, clusterID int32, routeID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteRoute(ctx, url, token, routeID)
}

// -------------------------------------------------------------
// Consumers
// -------------------------------------------------------------

func (u *kongUsecase) ListConsumers(ctx context.Context, clusterID int32) ([]domain.KongConsumer, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListConsumers(ctx, url, token)
}

func (u *kongUsecase) CreateConsumer(ctx context.Context, clusterID int32, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateConsumer(ctx, url, token, consumer)
}

func (u *kongUsecase) UpdateConsumer(ctx context.Context, clusterID int32, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdateConsumer(ctx, url, token, consumer)
}

func (u *kongUsecase) DeleteConsumer(ctx context.Context, clusterID int32, consumerID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteConsumer(ctx, url, token, consumerID)
}

// -------------------------------------------------------------
// Consumer Credentials & ACLs
// -------------------------------------------------------------

func (u *kongUsecase) ListKeyAuths(ctx context.Context, clusterID int32, consumerID string) ([]domain.KongKeyAuth, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListKeyAuths(ctx, url, token, consumerID)
}

func (u *kongUsecase) CreateKeyAuth(ctx context.Context, clusterID int32, consumerID string, keyAuth *domain.KongKeyAuth) (*domain.KongKeyAuth, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateKeyAuth(ctx, url, token, consumerID, keyAuth)
}

func (u *kongUsecase) DeleteKeyAuth(ctx context.Context, clusterID int32, consumerID, keyID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteKeyAuth(ctx, url, token, consumerID, keyID)
}

func (u *kongUsecase) ListJWTs(ctx context.Context, clusterID int32, consumerID string) ([]domain.KongJWT, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListJWTs(ctx, url, token, consumerID)
}

func (u *kongUsecase) CreateJWT(ctx context.Context, clusterID int32, consumerID string, jwt *domain.KongJWT) (*domain.KongJWT, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateJWT(ctx, url, token, consumerID, jwt)
}

func (u *kongUsecase) DeleteJWT(ctx context.Context, clusterID int32, consumerID, jwtID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteJWT(ctx, url, token, consumerID, jwtID)
}

func (u *kongUsecase) ListBasicAuths(ctx context.Context, clusterID int32, consumerID string) ([]domain.KongBasicAuth, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListBasicAuths(ctx, url, token, consumerID)
}

func (u *kongUsecase) CreateBasicAuth(ctx context.Context, clusterID int32, consumerID string, basicAuth *domain.KongBasicAuth) (*domain.KongBasicAuth, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateBasicAuth(ctx, url, token, consumerID, basicAuth)
}

func (u *kongUsecase) DeleteBasicAuth(ctx context.Context, clusterID int32, consumerID, authID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteBasicAuth(ctx, url, token, consumerID, authID)
}

func (u *kongUsecase) ListACLs(ctx context.Context, clusterID int32, consumerID string) ([]domain.KongACL, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListACLs(ctx, url, token, consumerID)
}

func (u *kongUsecase) CreateACL(ctx context.Context, clusterID int32, consumerID string, acl *domain.KongACL) (*domain.KongACL, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateACL(ctx, url, token, consumerID, acl)
}

func (u *kongUsecase) DeleteACL(ctx context.Context, clusterID int32, consumerID, aclID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteACL(ctx, url, token, consumerID, aclID)
}

// -------------------------------------------------------------
// Plugins
// -------------------------------------------------------------

func (u *kongUsecase) ListPlugins(ctx context.Context, clusterID int32) ([]domain.KongPlugin, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListPlugins(ctx, url, token)
}

func (u *kongUsecase) CreatePlugin(ctx context.Context, clusterID int32, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreatePlugin(ctx, url, token, plugin)
}

func (u *kongUsecase) UpdatePlugin(ctx context.Context, clusterID int32, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdatePlugin(ctx, url, token, plugin)
}

func (u *kongUsecase) DeletePlugin(ctx context.Context, clusterID int32, pluginID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeletePlugin(ctx, url, token, pluginID)
}

// -------------------------------------------------------------
// Upstreams
// -------------------------------------------------------------

func (u *kongUsecase) ListUpstreams(ctx context.Context, clusterID int32) ([]domain.KongUpstream, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListUpstreams(ctx, url, token)
}

func (u *kongUsecase) CreateUpstream(ctx context.Context, clusterID int32, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateUpstream(ctx, url, token, upstream)
}

func (u *kongUsecase) UpdateUpstream(ctx context.Context, clusterID int32, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdateUpstream(ctx, url, token, upstream)
}

func (u *kongUsecase) DeleteUpstream(ctx context.Context, clusterID int32, upstreamID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteUpstream(ctx, url, token, upstreamID)
}

func (u *kongUsecase) GetUpstreamHealth(ctx context.Context, clusterID int32, upstreamID string) (*domain.KongUpstreamHealth, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.GetUpstreamHealth(ctx, url, token, upstreamID)
}

// -------------------------------------------------------------
// Targets
// -------------------------------------------------------------

func (u *kongUsecase) ListTargets(ctx context.Context, clusterID int32, upstreamID string) ([]domain.KongTarget, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListTargets(ctx, url, token, upstreamID)
}

func (u *kongUsecase) CreateTarget(ctx context.Context, clusterID int32, upstreamID string, target *domain.KongTarget) (*domain.KongTarget, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateTarget(ctx, url, token, upstreamID, target)
}

func (u *kongUsecase) DeleteTarget(ctx context.Context, clusterID int32, upstreamID, targetID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteTarget(ctx, url, token, upstreamID, targetID)
}

func (u *kongUsecase) SetTargetHealthy(ctx context.Context, clusterID int32, upstreamID, targetID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.SetTargetHealthy(ctx, url, token, upstreamID, targetID)
}

func (u *kongUsecase) SetTargetUnhealthy(ctx context.Context, clusterID int32, upstreamID, targetID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.SetTargetUnhealthy(ctx, url, token, upstreamID, targetID)
}

// -------------------------------------------------------------
// Certificates & SNIs & CA Certificates
// -------------------------------------------------------------

func (u *kongUsecase) ListCertificates(ctx context.Context, clusterID int32) ([]domain.KongCertificate, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListCertificates(ctx, url, token)
}

func (u *kongUsecase) CreateCertificate(ctx context.Context, clusterID int32, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateCertificate(ctx, url, token, cert)
}

func (u *kongUsecase) UpdateCertificate(ctx context.Context, clusterID int32, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.UpdateCertificate(ctx, url, token, cert)
}

func (u *kongUsecase) DeleteCertificate(ctx context.Context, clusterID int32, certID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteCertificate(ctx, url, token, certID)
}

func (u *kongUsecase) ListSNIs(ctx context.Context, clusterID int32) ([]domain.KongSNI, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListSNIs(ctx, url, token)
}

func (u *kongUsecase) CreateSNI(ctx context.Context, clusterID int32, sni *domain.KongSNI) (*domain.KongSNI, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateSNI(ctx, url, token, sni)
}

func (u *kongUsecase) DeleteSNI(ctx context.Context, clusterID int32, sniName string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteSNI(ctx, url, token, sniName)
}

func (u *kongUsecase) ListCACertificates(ctx context.Context, clusterID int32) ([]domain.KongCACertificate, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.ListCACertificates(ctx, url, token)
}

func (u *kongUsecase) CreateCACertificate(ctx context.Context, clusterID int32, caCert *domain.KongCACertificate) (*domain.KongCACertificate, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.CreateCACertificate(ctx, url, token, caCert)
}

func (u *kongUsecase) DeleteCACertificate(ctx context.Context, clusterID int32, caCertID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	return u.kongClient.DeleteCACertificate(ctx, url, token, caCertID)
}

// -------------------------------------------------------------
// Gateway Status & Node
// -------------------------------------------------------------

func (u *kongUsecase) GetStatus(ctx context.Context, clusterID int32) (*domain.KongStatus, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.GetStatus(ctx, url, token)
}

func (u *kongUsecase) GetNodeInfo(ctx context.Context, clusterID int32) (*domain.KongNodeInfo, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	return u.kongClient.GetNodeInfo(ctx, url, token)
}

// -------------------------------------------------------------
// Declarative GitOps & Snapshots
// -------------------------------------------------------------

func (u *kongUsecase) DumpDeclarativeConfig(ctx context.Context, clusterID int32) (*domain.KongDeclarativeConfig, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}

	// Fetch all entities
	services, err := u.kongClient.ListServices(ctx, url, token)
	if err != nil {
		return nil, err
	}
	routes, err := u.kongClient.ListRoutes(ctx, url, token)
	if err != nil {
		return nil, err
	}
	upstreams, err := u.kongClient.ListUpstreams(ctx, url, token)
	if err != nil {
		return nil, err
	}
	consumers, err := u.kongClient.ListConsumers(ctx, url, token)
	if err != nil {
		return nil, err
	}
	plugins, err := u.kongClient.ListPlugins(ctx, url, token)
	if err != nil {
		return nil, err
	}
	certs, _ := u.kongClient.ListCertificates(ctx, url, token)
	caCerts, _ := u.kongClient.ListCACertificates(ctx, url, token)

	// Fetch Upstream Targets
	var decUpstreams []domain.KongDeclarativeUpstream
	for _, up := range upstreams {
		targets, _ := u.kongClient.ListTargets(ctx, url, token, up.ID)
		decUpstreams = append(decUpstreams, domain.KongDeclarativeUpstream{
			Name:         up.Name,
			Algorithm:    up.Algorithm,
			Slots:        up.Slots,
			HashOn:       up.HashOn,
			HashFallback: up.HashFallback,
			HashOnHeader: up.HashOnHeader,
			HashOnCookie: up.HashOnCookie,
			Healthchecks: up.Healthchecks,
			Tags:         up.Tags,
			Targets:      targets,
		})
	}

	// Fetch Consumer Credentials
	var decConsumers []domain.KongDeclarativeConsumer
	for _, c := range consumers {
		keys, _ := u.kongClient.ListKeyAuths(ctx, url, token, c.ID)
		jwts, _ := u.kongClient.ListJWTs(ctx, url, token, c.ID)
		basic, _ := u.kongClient.ListBasicAuths(ctx, url, token, c.ID)
		acls, _ := u.kongClient.ListACLs(ctx, url, token, c.ID)

		decConsumers = append(decConsumers, domain.KongDeclarativeConsumer{
			Username:             c.Username,
			CustomID:             c.CustomID,
			Tags:                 c.Tags,
			KeyAuthCredentials:   keys,
			JWTCredentials:       jwts,
			BasicAuthCredentials: basic,
			ACLs:                 acls,
		})
	}

	// Format Services & nested Routes/Plugins
	var decServices []domain.KongDeclarativeService
	for _, svc := range services {
		decServices = append(decServices, domain.KongDeclarativeService{
			Name:           svc.Name,
			Protocol:       svc.Protocol,
			Host:           svc.Host,
			Port:           svc.Port,
			Path:           svc.Path,
			Retries:        svc.Retries,
			ConnectTimeout: svc.ConnectTimeout,
			WriteTimeout:   svc.WriteTimeout,
			ReadTimeout:    svc.ReadTimeout,
			URL:            svc.URL,
			Enabled:        svc.Enabled,
			Tags:           svc.Tags,
		})
	}

	trueVal := true
	cfg := &domain.KongDeclarativeConfig{
		FormatVersion:  "3.0",
		Transform:      &trueVal,
		Services:       decServices,
		Routes:         routes,
		Upstreams:      decUpstreams,
		Consumers:      decConsumers,
		Plugins:        plugins,
		Certificates:   certs,
		CACertificates: caCerts,
	}

	return cfg, nil
}

func (u *kongUsecase) SyncDeclarativeConfig(ctx context.Context, clusterID int32, config *domain.KongDeclarativeConfig) (*domain.KongDiffSummary, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}

	summary := &domain.KongDiffSummary{}

	// 1. Sync Certificates
	for _, cert := range config.Certificates {
		_, err := u.kongClient.CreateCertificate(ctx, url, token, &cert)
		if err == nil {
			summary.CertificatesToCreate++
		}
	}

	// 2. Sync Upstreams & Targets
	for _, up := range config.Upstreams {
		upObj := &domain.KongUpstream{
			Name:         up.Name,
			Algorithm:    up.Algorithm,
			Slots:        up.Slots,
			HashOn:       up.HashOn,
			HashFallback: up.HashFallback,
			HashOnHeader: up.HashOnHeader,
			HashOnCookie: up.HashOnCookie,
			Healthchecks: up.Healthchecks,
			Tags:         up.Tags,
		}
		createdUp, err := u.kongClient.CreateUpstream(ctx, url, token, upObj)
		if err == nil {
			summary.UpstreamsToCreate++
			for _, target := range up.Targets {
				_, tErr := u.kongClient.CreateTarget(ctx, url, token, createdUp.ID, &target)
				if tErr == nil {
					summary.TargetsToCreate++
				}
			}
		}
	}

	// 3. Sync Services
	serviceMap := make(map[string]string) // name -> id
	for _, svc := range config.Services {
		svcObj := &domain.KongService{
			Name:           svc.Name,
			Protocol:       svc.Protocol,
			Host:           svc.Host,
			Port:           svc.Port,
			Path:           svc.Path,
			Retries:        svc.Retries,
			ConnectTimeout: svc.ConnectTimeout,
			WriteTimeout:   svc.WriteTimeout,
			ReadTimeout:    svc.ReadTimeout,
			URL:            svc.URL,
			Enabled:        svc.Enabled,
			Tags:           svc.Tags,
		}
		createdSvc, err := u.kongClient.CreateService(ctx, url, token, svcObj)
		if err == nil {
			summary.ServicesToCreate++
			serviceMap[svc.Name] = createdSvc.ID
		}
	}

	// 4. Sync Routes
	for _, route := range config.Routes {
		r := route
		if r.Service != nil && r.Service.Name != "" && serviceMap[r.Service.Name] != "" {
			r.Service.ID = serviceMap[r.Service.Name]
		}
		_, err := u.kongClient.CreateRoute(ctx, url, token, &r)
		if err == nil {
			summary.RoutesToCreate++
		}
	}

	// 5. Sync Consumers & Credentials
	for _, c := range config.Consumers {
		consumerObj := &domain.KongConsumer{
			Username: c.Username,
			CustomID: c.CustomID,
			Tags:     c.Tags,
		}
		createdC, err := u.kongClient.CreateConsumer(ctx, url, token, consumerObj)
		if err == nil {
			summary.ConsumersToCreate++
			for _, k := range c.KeyAuthCredentials {
				_, _ = u.kongClient.CreateKeyAuth(ctx, url, token, createdC.ID, &k)
				summary.CredentialsToCreate++
			}
			for _, j := range c.JWTCredentials {
				_, _ = u.kongClient.CreateJWT(ctx, url, token, createdC.ID, &j)
				summary.CredentialsToCreate++
			}
			for _, b := range c.BasicAuthCredentials {
				_, _ = u.kongClient.CreateBasicAuth(ctx, url, token, createdC.ID, &b)
				summary.CredentialsToCreate++
			}
			for _, a := range c.ACLs {
				_, _ = u.kongClient.CreateACL(ctx, url, token, createdC.ID, &a)
			}
		}
	}

	// 6. Sync Plugins
	for _, plugin := range config.Plugins {
		p := plugin
		_, err := u.kongClient.CreatePlugin(ctx, url, token, &p)
		if err == nil {
			summary.PluginsToCreate++
		}
	}

	return summary, nil
}

func (u *kongUsecase) CreateSnapshot(ctx context.Context, clusterID int32, name, description string) (*domain.Snapshot, error) {
	if u.snapshotRepo == nil {
		return nil, errors.New("snapshot repository not configured")
	}

	cfg, err := u.DumpDeclarativeConfig(ctx, clusterID)
	if err != nil {
		return nil, err
	}

	snap := &domain.Snapshot{
		ClusterID:   clusterID,
		Name:        name,
		Description: description,
		ConfigJSON:  cfg,
	}

	return u.snapshotRepo.Create(ctx, snap)
}

func (u *kongUsecase) ListSnapshots(ctx context.Context, clusterID int32) ([]domain.Snapshot, error) {
	if u.snapshotRepo == nil {
		return nil, errors.New("snapshot repository not configured")
	}
	return u.snapshotRepo.ListByClusterID(ctx, clusterID)
}

func (u *kongUsecase) RestoreSnapshot(ctx context.Context, clusterID int32, snapshotID int64) (*domain.KongDiffSummary, error) {
	if u.snapshotRepo == nil {
		return nil, errors.New("snapshot repository not configured")
	}

	snap, err := u.snapshotRepo.GetByID(ctx, snapshotID)
	if err != nil {
		return nil, err
	}

	if snap.ConfigJSON == nil {
		return nil, errors.New("snapshot contains empty configuration")
	}

	return u.SyncDeclarativeConfig(ctx, clusterID, snap.ConfigJSON)
}

func (u *kongUsecase) DeleteSnapshot(ctx context.Context, snapshotID int64) error {
	if u.snapshotRepo == nil {
		return errors.New("snapshot repository not configured")
	}
	return u.snapshotRepo.Delete(ctx, snapshotID)
}
