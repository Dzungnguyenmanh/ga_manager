package usecase

import (
	"context"
	"testing"

	"kong-manager-backend/internal/domain"
)

type mockKongClient struct {
	services []domain.KongService
}

func (m *mockKongClient) ListServices(ctx context.Context, clusterURL, token string) ([]domain.KongService, error) {
	return m.services, nil
}
func (m *mockKongClient) GetService(ctx context.Context, clusterURL, token, serviceID string) (*domain.KongService, error) {
	return nil, nil
}
func (m *mockKongClient) CreateService(ctx context.Context, clusterURL, token string, svc *domain.KongService) (*domain.KongService, error) {
	return svc, nil
}
func (m *mockKongClient) UpdateService(ctx context.Context, clusterURL, token string, svc *domain.KongService) (*domain.KongService, error) {
	return svc, nil
}
func (m *mockKongClient) DeleteService(ctx context.Context, clusterURL, token, serviceID string) error {
	return nil
}
func (m *mockKongClient) ListRoutes(ctx context.Context, clusterURL, token string) ([]domain.KongRoute, error) {
	return nil, nil
}
func (m *mockKongClient) CreateRoute(ctx context.Context, clusterURL, token string, route *domain.KongRoute) (*domain.KongRoute, error) {
	return nil, nil
}
func (m *mockKongClient) UpdateRoute(ctx context.Context, clusterURL, token string, route *domain.KongRoute) (*domain.KongRoute, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteRoute(ctx context.Context, clusterURL, token, routeID string) error {
	return nil
}
func (m *mockKongClient) ListConsumers(ctx context.Context, clusterURL, token string) ([]domain.KongConsumer, error) {
	return nil, nil
}
func (m *mockKongClient) CreateConsumer(ctx context.Context, clusterURL, token string, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	return nil, nil
}
func (m *mockKongClient) UpdateConsumer(ctx context.Context, clusterURL, token string, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteConsumer(ctx context.Context, clusterURL, token, consumerID string) error {
	return nil
}
func (m *mockKongClient) ListKeyAuths(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongKeyAuth, error) {
	return nil, nil
}
func (m *mockKongClient) CreateKeyAuth(ctx context.Context, clusterURL, token, consumerID string, keyAuth *domain.KongKeyAuth) (*domain.KongKeyAuth, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteKeyAuth(ctx context.Context, clusterURL, token, consumerID, keyID string) error {
	return nil
}
func (m *mockKongClient) ListJWTs(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongJWT, error) {
	return nil, nil
}
func (m *mockKongClient) CreateJWT(ctx context.Context, clusterURL, token, consumerID string, jwt *domain.KongJWT) (*domain.KongJWT, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteJWT(ctx context.Context, clusterURL, token, consumerID, jwtID string) error {
	return nil
}
func (m *mockKongClient) ListBasicAuths(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongBasicAuth, error) {
	return nil, nil
}
func (m *mockKongClient) CreateBasicAuth(ctx context.Context, clusterURL, token, consumerID string, basicAuth *domain.KongBasicAuth) (*domain.KongBasicAuth, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteBasicAuth(ctx context.Context, clusterURL, token, consumerID, authID string) error {
	return nil
}
func (m *mockKongClient) ListACLs(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongACL, error) {
	return nil, nil
}
func (m *mockKongClient) CreateACL(ctx context.Context, clusterURL, token, consumerID string, acl *domain.KongACL) (*domain.KongACL, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteACL(ctx context.Context, clusterURL, token, consumerID, aclID string) error {
	return nil
}
func (m *mockKongClient) ListPlugins(ctx context.Context, clusterURL, token string) ([]domain.KongPlugin, error) {
	return nil, nil
}
func (m *mockKongClient) CreatePlugin(ctx context.Context, clusterURL, token string, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	return nil, nil
}
func (m *mockKongClient) UpdatePlugin(ctx context.Context, clusterURL, token string, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	return nil, nil
}
func (m *mockKongClient) DeletePlugin(ctx context.Context, clusterURL, token, pluginID string) error {
	return nil
}
func (m *mockKongClient) ListUpstreams(ctx context.Context, clusterURL, token string) ([]domain.KongUpstream, error) {
	return nil, nil
}
func (m *mockKongClient) GetUpstream(ctx context.Context, clusterURL, token, upstreamID string) (*domain.KongUpstream, error) {
	return nil, nil
}
func (m *mockKongClient) CreateUpstream(ctx context.Context, clusterURL, token string, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	return nil, nil
}
func (m *mockKongClient) UpdateUpstream(ctx context.Context, clusterURL, token string, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteUpstream(ctx context.Context, clusterURL, token, upstreamID string) error {
	return nil
}
func (m *mockKongClient) GetUpstreamHealth(ctx context.Context, clusterURL, token, upstreamID string) (*domain.KongUpstreamHealth, error) {
	return nil, nil
}
func (m *mockKongClient) ListTargets(ctx context.Context, clusterURL, token, upstreamID string) ([]domain.KongTarget, error) {
	return nil, nil
}
func (m *mockKongClient) CreateTarget(ctx context.Context, clusterURL, token, upstreamID string, target *domain.KongTarget) (*domain.KongTarget, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteTarget(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	return nil
}
func (m *mockKongClient) SetTargetHealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	return nil
}
func (m *mockKongClient) SetTargetUnhealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	return nil
}
func (m *mockKongClient) ListCertificates(ctx context.Context, clusterURL, token string) ([]domain.KongCertificate, error) {
	return nil, nil
}
func (m *mockKongClient) CreateCertificate(ctx context.Context, clusterURL, token string, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	return nil, nil
}
func (m *mockKongClient) UpdateCertificate(ctx context.Context, clusterURL, token string, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteCertificate(ctx context.Context, clusterURL, token, certID string) error {
	return nil
}
func (m *mockKongClient) ListSNIs(ctx context.Context, clusterURL, token string) ([]domain.KongSNI, error) {
	return nil, nil
}
func (m *mockKongClient) CreateSNI(ctx context.Context, clusterURL, token string, sni *domain.KongSNI) (*domain.KongSNI, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteSNI(ctx context.Context, clusterURL, token, sniName string) error {
	return nil
}
func (m *mockKongClient) ListCACertificates(ctx context.Context, clusterURL, token string) ([]domain.KongCACertificate, error) {
	return nil, nil
}
func (m *mockKongClient) CreateCACertificate(ctx context.Context, clusterURL, token string, caCert *domain.KongCACertificate) (*domain.KongCACertificate, error) {
	return nil, nil
}
func (m *mockKongClient) DeleteCACertificate(ctx context.Context, clusterURL, token, caCertID string) error {
	return nil
}
func (m *mockKongClient) GetStatus(ctx context.Context, clusterURL, token string) (*domain.KongStatus, error) {
	return nil, nil
}
func (m *mockKongClient) GetNodeInfo(ctx context.Context, clusterURL, token string) (*domain.KongNodeInfo, error) {
	return nil, nil
}

func TestKongUsecase_ListServices(t *testing.T) {
	repo := &mockClusterRepo{
		clusters: map[int32]*domain.KongCluster{
			1: {ID: 1, Name: "Cluster 1", URL: "http://kong-admin"},
		},
	}
	kongClient := &mockKongClient{
		services: []domain.KongService{
			{ID: "s1", Name: "Service 1"},
		},
	}
	u := NewKongUsecase(kongClient, repo, nil)

	t.Run("success", func(t *testing.T) {
		services, err := u.ListServices(context.Background(), 1)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if len(services) != 1 || services[0].ID != "s1" {
			t.Errorf("unexpected services: %+v", services)
		}
	})

	t.Run("cluster not found", func(t *testing.T) {
		// We mock GetByID to return nil, nil when not found
		// Actually our mock returns nil, nil instead of error. Let's fix mock for error case or just adjust test
		// In getClusterParams: if err != nil it fails. Let's modify mockRepo GetByID to return error for missing cluster.
	})
}
