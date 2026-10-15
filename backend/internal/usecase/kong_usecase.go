package usecase

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"strings"
	"time"

	"kong-manager-backend/internal/domain"
)

type kongUsecase struct {
	kongClient   domain.KongClient
	clusterRepo  domain.ClusterRepository
	snapshotRepo domain.SnapshotRepository
	auditRepo    domain.AuditRepository
}

func NewKongUsecase(
	client domain.KongClient,
	repo domain.ClusterRepository,
	snapshotRepo domain.SnapshotRepository,
	auditRepo domain.AuditRepository,
) domain.KongUsecase {
	return &kongUsecase{
		kongClient:   client,
		clusterRepo:  repo,
		snapshotRepo: snapshotRepo,
		auditRepo:    auditRepo,
	}
}

func (u *kongUsecase) logAudit(ctx context.Context, clusterID int32, action, resource, resourceID string, details map[string]any) {
	if u.auditRepo == nil {
		return
	}
	_ = u.auditRepo.Create(ctx, &domain.AuditLog{
		ClusterID:  &clusterID,
		Username:   "operator",
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
	})
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
	res, err := u.kongClient.CreateService(ctx, url, token, svc)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "service", res.ID, map[string]any{"name": res.Name, "host": res.Host, "protocol": res.Protocol})
	}
	return res, err
}

func (u *kongUsecase) UpdateService(ctx context.Context, clusterID int32, svc *domain.KongService) (*domain.KongService, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	res, err := u.kongClient.UpdateService(ctx, url, token, svc)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "UPDATE", "service", svc.ID, map[string]any{"name": svc.Name, "host": svc.Host})
	}
	return res, err
}

func (u *kongUsecase) DeleteService(ctx context.Context, clusterID int32, serviceID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteService(ctx, url, token, serviceID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "service", serviceID, nil)
	}
	return err
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
	res, err := u.kongClient.CreateRoute(ctx, url, token, route)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "route", res.ID, map[string]any{"name": res.Name, "paths": res.Paths, "methods": res.Methods})
	}
	return res, err
}

func (u *kongUsecase) UpdateRoute(ctx context.Context, clusterID int32, route *domain.KongRoute) (*domain.KongRoute, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	res, err := u.kongClient.UpdateRoute(ctx, url, token, route)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "UPDATE", "route", route.ID, map[string]any{"name": route.Name})
	}
	return res, err
}

func (u *kongUsecase) DeleteRoute(ctx context.Context, clusterID int32, routeID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteRoute(ctx, url, token, routeID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "route", routeID, nil)
	}
	return err
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
	res, err := u.kongClient.CreateConsumer(ctx, url, token, consumer)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "consumer", res.ID, map[string]any{"username": res.Username, "custom_id": res.CustomID})
	}
	return res, err
}

func (u *kongUsecase) UpdateConsumer(ctx context.Context, clusterID int32, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	res, err := u.kongClient.UpdateConsumer(ctx, url, token, consumer)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "UPDATE", "consumer", consumer.ID, map[string]any{"username": consumer.Username})
	}
	return res, err
}

func (u *kongUsecase) DeleteConsumer(ctx context.Context, clusterID int32, consumerID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteConsumer(ctx, url, token, consumerID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "consumer", consumerID, nil)
	}
	return err
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
	res, err := u.kongClient.CreateKeyAuth(ctx, url, token, consumerID, keyAuth)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "key_auth", res.ID, map[string]any{"consumer_id": consumerID})
	}
	return res, err
}

func (u *kongUsecase) DeleteKeyAuth(ctx context.Context, clusterID int32, consumerID, keyID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteKeyAuth(ctx, url, token, consumerID, keyID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "key_auth", keyID, map[string]any{"consumer_id": consumerID})
	}
	return err
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
	res, err := u.kongClient.CreateJWT(ctx, url, token, consumerID, jwt)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "jwt", res.ID, map[string]any{"consumer_id": consumerID, "key": res.Key, "algorithm": res.Algorithm})
	}
	return res, err
}

func (u *kongUsecase) DeleteJWT(ctx context.Context, clusterID int32, consumerID, jwtID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteJWT(ctx, url, token, consumerID, jwtID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "jwt", jwtID, map[string]any{"consumer_id": consumerID})
	}
	return err
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
	res, err := u.kongClient.CreateBasicAuth(ctx, url, token, consumerID, basicAuth)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "basic_auth", res.ID, map[string]any{"consumer_id": consumerID, "username": res.Username})
	}
	return res, err
}

func (u *kongUsecase) DeleteBasicAuth(ctx context.Context, clusterID int32, consumerID, authID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteBasicAuth(ctx, url, token, consumerID, authID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "basic_auth", authID, map[string]any{"consumer_id": consumerID})
	}
	return err
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
	res, err := u.kongClient.CreateACL(ctx, url, token, consumerID, acl)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "acl", res.ID, map[string]any{"consumer_id": consumerID, "group": res.Group})
	}
	return res, err
}

func (u *kongUsecase) DeleteACL(ctx context.Context, clusterID int32, consumerID, aclID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteACL(ctx, url, token, consumerID, aclID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "acl", aclID, map[string]any{"consumer_id": consumerID})
	}
	return err
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
	res, err := u.kongClient.CreatePlugin(ctx, url, token, plugin)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "plugin", res.ID, map[string]any{"name": res.Name, "enabled": res.Enabled})
	}
	return res, err
}

func (u *kongUsecase) UpdatePlugin(ctx context.Context, clusterID int32, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	res, err := u.kongClient.UpdatePlugin(ctx, url, token, plugin)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "UPDATE", "plugin", plugin.ID, map[string]any{"name": plugin.Name, "enabled": plugin.Enabled})
	}
	return res, err
}

func (u *kongUsecase) DeletePlugin(ctx context.Context, clusterID int32, pluginID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeletePlugin(ctx, url, token, pluginID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "plugin", pluginID, nil)
	}
	return err
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
	res, err := u.kongClient.CreateUpstream(ctx, url, token, upstream)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "CREATE", "upstream", res.ID, map[string]any{"name": res.Name, "algorithm": res.Algorithm})
	}
	return res, err
}

func (u *kongUsecase) UpdateUpstream(ctx context.Context, clusterID int32, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return nil, err
	}
	res, err := u.kongClient.UpdateUpstream(ctx, url, token, upstream)
	if err == nil && res != nil {
		u.logAudit(ctx, clusterID, "UPDATE", "upstream", upstream.ID, map[string]any{"name": upstream.Name})
	}
	return res, err
}

func (u *kongUsecase) DeleteUpstream(ctx context.Context, clusterID int32, upstreamID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.DeleteUpstream(ctx, url, token, upstreamID)
	if err == nil {
		u.logAudit(ctx, clusterID, "DELETE", "upstream", upstreamID, nil)
	}
	return err
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
	err = u.kongClient.SetTargetHealthy(ctx, url, token, upstreamID, targetID)
	if err == nil {
		u.logAudit(ctx, clusterID, "UPDATE", "target", targetID, map[string]any{"upstream_id": upstreamID, "health": "healthy"})
	}
	return err
}

func (u *kongUsecase) SetTargetUnhealthy(ctx context.Context, clusterID int32, upstreamID, targetID string) error {
	url, token, err := u.getClusterParams(ctx, clusterID)
	if err != nil {
		return err
	}
	err = u.kongClient.SetTargetUnhealthy(ctx, url, token, upstreamID, targetID)
	if err == nil {
		u.logAudit(ctx, clusterID, "UPDATE", "target", targetID, map[string]any{"upstream_id": upstreamID, "health": "unhealthy"})
	}
	return err
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

func (u *kongUsecase) DiffDeclarativeConfig(ctx context.Context, clusterID int32, config *domain.KongDeclarativeConfig) (*domain.KongDiffSummary, error) {
	if config == nil {
		return &domain.KongDiffSummary{}, nil
	}

	summary := &domain.KongDiffSummary{
		ServicesToCreate:     len(config.Services),
		RoutesToCreate:       len(config.Routes),
		UpstreamsToCreate:    len(config.Upstreams),
		ConsumersToCreate:    len(config.Consumers),
		PluginsToCreate:      len(config.Plugins),
		CertificatesToCreate: len(config.Certificates),
	}

	for _, s := range config.Services {
		summary.RoutesToCreate += len(s.Routes)
		summary.PluginsToCreate += len(s.Plugins)
	}

	for _, u := range config.Upstreams {
		summary.TargetsToCreate += len(u.Targets)
	}

	for _, c := range config.Consumers {
		summary.CredentialsToCreate += len(c.KeyAuthCredentials) + len(c.JWTCredentials) + len(c.BasicAuthCredentials)
	}

	return summary, nil
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

	diff, err := u.SyncDeclarativeConfig(ctx, clusterID, snap.ConfigJSON)
	if err == nil {
		u.logAudit(ctx, clusterID, "RESTORE_SNAPSHOT", "snapshot", fmt.Sprintf("%d", snapshotID), map[string]any{"name": snap.Name})
	}
	return diff, err
}

func (u *kongUsecase) DeleteSnapshot(ctx context.Context, snapshotID int64) error {
	if u.snapshotRepo == nil {
		return errors.New("snapshot repository not configured")
	}
	return u.snapshotRepo.Delete(ctx, snapshotID)
}

func (u *kongUsecase) TestRequest(ctx context.Context, clusterID int32, req *domain.TestRequestInput) (*domain.TestRequestResult, error) {
	cluster, err := u.clusterRepo.GetByID(ctx, clusterID)
	if err != nil {
		return nil, errors.New("cluster not found")
	}

	targetURL := req.URL
	if !strings.HasPrefix(targetURL, "http://") && !strings.HasPrefix(targetURL, "https://") {
		// Relative path: derive proxy URL from cluster Admin URL
		// Kong default: Admin API port 8001 -> Proxy port 8000; Admin 8444 -> Proxy 8443
		proxyBase := cluster.URL
		if strings.Contains(proxyBase, ":8001") {
			proxyBase = strings.Replace(proxyBase, ":8001", ":8000", 1)
		} else if strings.Contains(proxyBase, ":8444") {
			proxyBase = strings.Replace(proxyBase, ":8444", ":8443", 1)
		}
		if !strings.HasPrefix(targetURL, "/") {
			targetURL = "/" + targetURL
		}
		targetURL = strings.TrimRight(proxyBase, "/") + targetURL
	}

	method := strings.ToUpper(req.Method)
	if method == "" {
		method = "GET"
	}

	timeoutSec := req.Timeout
	if timeoutSec <= 0 || timeoutSec > 60 {
		timeoutSec = 15
	}

	var reqBody io.Reader
	if req.Body != "" {
		reqBody = strings.NewReader(req.Body)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, targetURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to build HTTP request: %w", err)
	}

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	client := &http.Client{
		Timeout: time.Duration(timeoutSec) * time.Second,
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	duration := time.Since(start)

	if err != nil {
		return &domain.TestRequestResult{
			StatusCode: 0,
			StatusText: "Connection Error: " + err.Error(),
			LatencyMS:  math.Round(duration.Seconds()*100000) / 100,
			Headers:    make(map[string][]string),
			Body:       err.Error(),
			SizeBytes:  0,
		}, nil
	}
	defer resp.Body.Close()

	// Read body capped at 1MB
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	resHeaders := make(map[string][]string)
	for k, v := range resp.Header {
		resHeaders[k] = v
	}

	return &domain.TestRequestResult{
		StatusCode: resp.StatusCode,
		StatusText: resp.Status,
		LatencyMS:  math.Round(duration.Seconds()*100000) / 100,
		Headers:    resHeaders,
		Body:       string(bodyBytes),
		SizeBytes:  int64(len(bodyBytes)),
	}, nil
}

func (u *kongUsecase) RunDiagnostics(ctx context.Context, clusterID int32, input *domain.DiagnosticsInput) (*domain.DiagnosticsResult, error) {
	if input == nil || strings.TrimSpace(input.Host) == "" {
		return nil, errors.New("host is required for diagnostics")
	}

	host := strings.TrimSpace(input.Host)
	port := input.Port
	protocol := strings.ToLower(strings.TrimSpace(input.Protocol))
	if protocol == "" {
		if port == 443 {
			protocol = "https"
		} else if port == 80 {
			protocol = "http"
		} else {
			protocol = "tcp"
		}
	}
	if port <= 0 {
		if protocol == "https" || protocol == "tls" {
			port = 443
		} else {
			port = 80
		}
	}

	timeoutSec := input.Timeout
	if timeoutSec <= 0 || timeoutSec > 30 {
		timeoutSec = 5
	}
	stepTimeout := time.Duration(timeoutSec) * time.Second

	result := &domain.DiagnosticsResult{
		Target:  fmt.Sprintf("%s:%d (%s)", host, port, protocol),
		Success: true,
		Steps:   make([]domain.DiagnosticsStep, 0, 4),
	}
	totalStart := time.Now()

	// 1. DNS Resolution
	dnsStart := time.Now()
	resolver := net.Resolver{PreferGo: true}
	resolveCtx, resolveCancel := context.WithTimeout(ctx, stepTimeout)
	ips, err := resolver.LookupIPAddr(resolveCtx, host)
	resolveCancel()
	dnsLatency := math.Round(time.Since(dnsStart).Seconds()*100000) / 100

	if err != nil {
		result.Success = false
		result.Error = "DNS resolution failed"
		result.Steps = append(result.Steps, domain.DiagnosticsStep{
			Step:      "DNS",
			Status:    "FAILED",
			Message:   fmt.Sprintf("Failed to resolve host %s: %v", host, err),
			LatencyMS: dnsLatency,
		})
		result.Steps = append(result.Steps,
			domain.DiagnosticsStep{Step: "TCP_CONNECT", Status: "SKIPPED", Message: "DNS failed"},
			domain.DiagnosticsStep{Step: "TLS_HANDSHAKE", Status: "SKIPPED", Message: "DNS failed"},
			domain.DiagnosticsStep{Step: "HTTP_PROBE", Status: "SKIPPED", Message: "DNS failed"},
		)
		result.TotalMS = math.Round(time.Since(totalStart).Seconds()*100000) / 100
		return result, nil
	}

	ipStrings := make([]string, len(ips))
	for i, ip := range ips {
		ipStrings[i] = ip.String()
	}
	result.Steps = append(result.Steps, domain.DiagnosticsStep{
		Step:      "DNS",
		Status:    "SUCCESS",
		Message:   fmt.Sprintf("Resolved %d IP(s): %s", len(ips), strings.Join(ipStrings, ", ")),
		LatencyMS: dnsLatency,
	})

	// 2. TCP Connect
	tcpTarget := net.JoinHostPort(host, fmt.Sprintf("%d", port))
	tcpStart := time.Now()
	dialer := &net.Dialer{Timeout: stepTimeout}
	conn, err := dialer.DialContext(ctx, "tcp", tcpTarget)
	tcpLatency := math.Round(time.Since(tcpStart).Seconds()*100000) / 100

	if err != nil {
		result.Success = false
		result.Error = "TCP connection failed"
		result.Steps = append(result.Steps, domain.DiagnosticsStep{
			Step:      "TCP_CONNECT",
			Status:    "FAILED",
			Message:   fmt.Sprintf("Connection refused or timed out to %s: %v", tcpTarget, err),
			LatencyMS: tcpLatency,
		})
		result.Steps = append(result.Steps,
			domain.DiagnosticsStep{Step: "TLS_HANDSHAKE", Status: "SKIPPED", Message: "TCP connection failed"},
			domain.DiagnosticsStep{Step: "HTTP_PROBE", Status: "SKIPPED", Message: "TCP connection failed"},
		)
		result.TotalMS = math.Round(time.Since(totalStart).Seconds()*100000) / 100
		return result, nil
	}
	_ = conn.Close()
	result.Steps = append(result.Steps, domain.DiagnosticsStep{
		Step:      "TCP_CONNECT",
		Status:    "SUCCESS",
		Message:   fmt.Sprintf("Successfully established TCP handshake with %s", tcpTarget),
		LatencyMS: tcpLatency,
	})

	// 3. TLS Handshake (if TLS or HTTPS)
	isTLS := protocol == "https" || protocol == "tls" || port == 443
	if !isTLS {
		result.Steps = append(result.Steps, domain.DiagnosticsStep{
			Step:      "TLS_HANDSHAKE",
			Status:    "SKIPPED",
			Message:   "Target protocol does not require TLS",
			LatencyMS: 0,
		})
	} else {
		tlsStart := time.Now()
		tlsDialer := &tls.Dialer{
			NetDialer: &net.Dialer{Timeout: stepTimeout},
			Config: &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         host,
			},
		}
		tlsConn, err := tlsDialer.DialContext(ctx, "tcp", tcpTarget)
		tlsLatency := math.Round(time.Since(tlsStart).Seconds()*100000) / 100

		if err != nil {
			result.Success = false
			result.Error = "TLS handshake failed"
			result.Steps = append(result.Steps, domain.DiagnosticsStep{
				Step:      "TLS_HANDSHAKE",
				Status:    "FAILED",
				Message:   fmt.Sprintf("TLS Handshake error with %s: %v", tcpTarget, err),
				LatencyMS: tlsLatency,
			})
			result.Steps = append(result.Steps, domain.DiagnosticsStep{
				Step: "HTTP_PROBE", Status: "SKIPPED", Message: "TLS handshake failed",
			})
			result.TotalMS = math.Round(time.Since(totalStart).Seconds()*100000) / 100
			return result, nil
		}
		tlsState := tlsConn.(*tls.Conn).ConnectionState()
		_ = tlsConn.Close()

		result.Steps = append(result.Steps, domain.DiagnosticsStep{
			Step:      "TLS_HANDSHAKE",
			Status:    "SUCCESS",
			Message:   fmt.Sprintf("TLS Handshake succeeded (TLS 0x%04x, Cipher 0x%04x)", tlsState.Version, tlsState.CipherSuite),
			LatencyMS: tlsLatency,
		})
	}

	// 4. HTTP Probe (if HTTP or HTTPS)
	isHTTP := protocol == "http" || protocol == "https" || port == 80 || port == 443 || port == 8000 || port == 8080
	if !isHTTP {
		result.Steps = append(result.Steps, domain.DiagnosticsStep{
			Step:      "HTTP_PROBE",
			Status:    "SKIPPED",
			Message:   "Raw TCP/TLS target, skipped HTTP probe",
			LatencyMS: 0,
		})
	} else {
		httpStart := time.Now()
		scheme := "http"
		if isTLS {
			scheme = "https"
		}
		path := input.Path
		if path == "" {
			path = "/"
		} else if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		httpURL := fmt.Sprintf("%s://%s:%d%s", scheme, host, port, path)

		httpReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, httpURL, nil)
		tr := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		}
		client := &http.Client{Transport: tr, Timeout: stepTimeout}
		resp, err := client.Do(httpReq)
		httpLatency := math.Round(time.Since(httpStart).Seconds()*100000) / 100

		if err != nil {
			result.Success = false
			result.Error = "HTTP probe failed: " + err.Error()
			result.Steps = append(result.Steps, domain.DiagnosticsStep{
				Step:      "HTTP_PROBE",
				Status:    "FAILED",
				Message:   fmt.Sprintf("HTTP GET %s failed: %v", httpURL, err),
				LatencyMS: httpLatency,
			})
		} else {
			_ = resp.Body.Close()
			result.Steps = append(result.Steps, domain.DiagnosticsStep{
				Step:      "HTTP_PROBE",
				Status:    "SUCCESS",
				Message:   fmt.Sprintf("HTTP %s -> Status: %s (Code %d)", httpURL, resp.Status, resp.StatusCode),
				LatencyMS: httpLatency,
			})
		}
	}

	result.TotalMS = math.Round(time.Since(totalStart).Seconds()*100000) / 100
	return result, nil
}

func (u *kongUsecase) PromoteConfig(ctx context.Context, sourceClusterID, targetClusterID int32) (*domain.KongDiffSummary, error) {
	if sourceClusterID == targetClusterID {
		return nil, errors.New("source and target cluster must be different")
	}

	sourceCluster, err := u.clusterRepo.GetByID(ctx, sourceClusterID)
	if err != nil {
		return nil, fmt.Errorf("source cluster not found: %w", err)
	}
	targetCluster, err := u.clusterRepo.GetByID(ctx, targetClusterID)
	if err != nil {
		return nil, fmt.Errorf("target cluster not found: %w", err)
	}

	// 1. Dump source configuration
	sourceConfig, err := u.DumpDeclarativeConfig(ctx, sourceClusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to dump configuration from source cluster (%s): %w", sourceCluster.Name, err)
	}

	// 2. Sync to target cluster
	diffSummary, err := u.SyncDeclarativeConfig(ctx, targetClusterID, sourceConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to sync configuration to target cluster (%s): %w", targetCluster.Name, err)
	}

	// 3. Log audit
	u.logAudit(ctx, targetClusterID, "PROMOTE", "CLUSTER", fmt.Sprintf("%d->%d", sourceClusterID, targetClusterID), map[string]any{
		"source_cluster_id":   sourceClusterID,
		"source_cluster_name": sourceCluster.Name,
		"target_cluster_id":   targetClusterID,
		"target_cluster_name": targetCluster.Name,
		"diff_summary":        diffSummary,
	})

	return diffSummary, nil
}
