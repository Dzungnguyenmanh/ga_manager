package kong

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"kong-manager-backend/internal/domain"
)

type kongClient struct {
	client *http.Client
}

func NewKongClient() domain.KongClient {
	return &kongClient{
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *kongClient) doRequest(ctx context.Context, method, url, token string, body io.Reader) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Kong-Admin-Token", token)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("kong api error: %d %s", resp.StatusCode, string(respBody))
	}

	return io.ReadAll(resp.Body)
}

// -------------------------------------------------------------
// Services
// -------------------------------------------------------------

func (c *kongClient) ListServices(ctx context.Context, clusterURL, token string) ([]domain.KongService, error) {
	url := fmt.Sprintf("%s/services", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongService `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) GetService(ctx context.Context, clusterURL, token, serviceID string) (*domain.KongService, error) {
	url := fmt.Sprintf("%s/services/%s", clusterURL, serviceID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var svc domain.KongService
	if err := json.Unmarshal(data, &svc); err != nil {
		return nil, err
	}
	return &svc, nil
}

func (c *kongClient) CreateService(ctx context.Context, clusterURL, token string, svc *domain.KongService) (*domain.KongService, error) {
	url := fmt.Sprintf("%s/services", clusterURL)
	body, _ := json.Marshal(svc)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var createdSvc domain.KongService
	if err := json.Unmarshal(data, &createdSvc); err != nil {
		return nil, err
	}
	return &createdSvc, nil
}

func (c *kongClient) UpdateService(ctx context.Context, clusterURL, token string, svc *domain.KongService) (*domain.KongService, error) {
	url := fmt.Sprintf("%s/services/%s", clusterURL, svc.ID)
	body, _ := json.Marshal(svc)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updatedSvc domain.KongService
	if err := json.Unmarshal(data, &updatedSvc); err != nil {
		return nil, err
	}
	return &updatedSvc, nil
}

func (c *kongClient) DeleteService(ctx context.Context, clusterURL, token, serviceID string) error {
	url := fmt.Sprintf("%s/services/%s", clusterURL, serviceID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

func (c *kongClient) ListRoutes(ctx context.Context, clusterURL, token string) ([]domain.KongRoute, error) {
	url := fmt.Sprintf("%s/routes", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongRoute `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateRoute(ctx context.Context, clusterURL, token string, route *domain.KongRoute) (*domain.KongRoute, error) {
	url := fmt.Sprintf("%s/routes", clusterURL)
	body, _ := json.Marshal(route)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var createdRoute domain.KongRoute
	if err := json.Unmarshal(data, &createdRoute); err != nil {
		return nil, err
	}
	return &createdRoute, nil
}

func (c *kongClient) UpdateRoute(ctx context.Context, clusterURL, token string, route *domain.KongRoute) (*domain.KongRoute, error) {
	url := fmt.Sprintf("%s/routes/%s", clusterURL, route.ID)
	body, _ := json.Marshal(route)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updatedRoute domain.KongRoute
	if err := json.Unmarshal(data, &updatedRoute); err != nil {
		return nil, err
	}
	return &updatedRoute, nil
}

func (c *kongClient) DeleteRoute(ctx context.Context, clusterURL, token, routeID string) error {
	url := fmt.Sprintf("%s/routes/%s", clusterURL, routeID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Consumers
// -------------------------------------------------------------

func (c *kongClient) ListConsumers(ctx context.Context, clusterURL, token string) ([]domain.KongConsumer, error) {
	url := fmt.Sprintf("%s/consumers", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongConsumer `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateConsumer(ctx context.Context, clusterURL, token string, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	url := fmt.Sprintf("%s/consumers", clusterURL)
	body, _ := json.Marshal(consumer)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongConsumer
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) UpdateConsumer(ctx context.Context, clusterURL, token string, consumer *domain.KongConsumer) (*domain.KongConsumer, error) {
	url := fmt.Sprintf("%s/consumers/%s", clusterURL, consumer.ID)
	body, _ := json.Marshal(consumer)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updated domain.KongConsumer
	if err := json.Unmarshal(data, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (c *kongClient) DeleteConsumer(ctx context.Context, clusterURL, token, consumerID string) error {
	url := fmt.Sprintf("%s/consumers/%s", clusterURL, consumerID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Consumer Credentials & ACLs
// -------------------------------------------------------------

// KeyAuth
func (c *kongClient) ListKeyAuths(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongKeyAuth, error) {
	url := fmt.Sprintf("%s/consumers/%s/key-auth", clusterURL, consumerID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongKeyAuth `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateKeyAuth(ctx context.Context, clusterURL, token, consumerID string, keyAuth *domain.KongKeyAuth) (*domain.KongKeyAuth, error) {
	url := fmt.Sprintf("%s/consumers/%s/key-auth", clusterURL, consumerID)
	body, _ := json.Marshal(keyAuth)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongKeyAuth
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteKeyAuth(ctx context.Context, clusterURL, token, consumerID, keyID string) error {
	url := fmt.Sprintf("%s/consumers/%s/key-auth/%s", clusterURL, consumerID, keyID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// JWT
func (c *kongClient) ListJWTs(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongJWT, error) {
	url := fmt.Sprintf("%s/consumers/%s/jwt", clusterURL, consumerID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongJWT `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateJWT(ctx context.Context, clusterURL, token, consumerID string, jwt *domain.KongJWT) (*domain.KongJWT, error) {
	url := fmt.Sprintf("%s/consumers/%s/jwt", clusterURL, consumerID)
	body, _ := json.Marshal(jwt)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongJWT
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteJWT(ctx context.Context, clusterURL, token, consumerID, jwtID string) error {
	url := fmt.Sprintf("%s/consumers/%s/jwt/%s", clusterURL, consumerID, jwtID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// BasicAuth
func (c *kongClient) ListBasicAuths(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongBasicAuth, error) {
	url := fmt.Sprintf("%s/consumers/%s/basic-auth", clusterURL, consumerID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongBasicAuth `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateBasicAuth(ctx context.Context, clusterURL, token, consumerID string, basicAuth *domain.KongBasicAuth) (*domain.KongBasicAuth, error) {
	url := fmt.Sprintf("%s/consumers/%s/basic-auth", clusterURL, consumerID)
	body, _ := json.Marshal(basicAuth)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongBasicAuth
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteBasicAuth(ctx context.Context, clusterURL, token, consumerID, authID string) error {
	url := fmt.Sprintf("%s/consumers/%s/basic-auth/%s", clusterURL, consumerID, authID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// ACLs
func (c *kongClient) ListACLs(ctx context.Context, clusterURL, token, consumerID string) ([]domain.KongACL, error) {
	url := fmt.Sprintf("%s/consumers/%s/acls", clusterURL, consumerID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongACL `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateACL(ctx context.Context, clusterURL, token, consumerID string, acl *domain.KongACL) (*domain.KongACL, error) {
	url := fmt.Sprintf("%s/consumers/%s/acls", clusterURL, consumerID)
	body, _ := json.Marshal(acl)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongACL
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteACL(ctx context.Context, clusterURL, token, consumerID, aclID string) error {
	url := fmt.Sprintf("%s/consumers/%s/acls/%s", clusterURL, consumerID, aclID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Plugins
// -------------------------------------------------------------

func (c *kongClient) ListPlugins(ctx context.Context, clusterURL, token string) ([]domain.KongPlugin, error) {
	url := fmt.Sprintf("%s/plugins", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongPlugin `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreatePlugin(ctx context.Context, clusterURL, token string, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	url := fmt.Sprintf("%s/plugins", clusterURL)
	body, _ := json.Marshal(plugin)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongPlugin
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) UpdatePlugin(ctx context.Context, clusterURL, token string, plugin *domain.KongPlugin) (*domain.KongPlugin, error) {
	url := fmt.Sprintf("%s/plugins/%s", clusterURL, plugin.ID)
	body, _ := json.Marshal(plugin)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updated domain.KongPlugin
	if err := json.Unmarshal(data, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (c *kongClient) DeletePlugin(ctx context.Context, clusterURL, token, pluginID string) error {
	url := fmt.Sprintf("%s/plugins/%s", clusterURL, pluginID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Upstreams
// -------------------------------------------------------------

func (c *kongClient) ListUpstreams(ctx context.Context, clusterURL, token string) ([]domain.KongUpstream, error) {
	url := fmt.Sprintf("%s/upstreams", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongUpstream `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) GetUpstream(ctx context.Context, clusterURL, token, upstreamID string) (*domain.KongUpstream, error) {
	url := fmt.Sprintf("%s/upstreams/%s", clusterURL, upstreamID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var upstream domain.KongUpstream
	if err := json.Unmarshal(data, &upstream); err != nil {
		return nil, err
	}
	return &upstream, nil
}

func (c *kongClient) CreateUpstream(ctx context.Context, clusterURL, token string, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	url := fmt.Sprintf("%s/upstreams", clusterURL)
	body, _ := json.Marshal(upstream)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongUpstream
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) UpdateUpstream(ctx context.Context, clusterURL, token string, upstream *domain.KongUpstream) (*domain.KongUpstream, error) {
	url := fmt.Sprintf("%s/upstreams/%s", clusterURL, upstream.ID)
	body, _ := json.Marshal(upstream)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updated domain.KongUpstream
	if err := json.Unmarshal(data, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (c *kongClient) DeleteUpstream(ctx context.Context, clusterURL, token, upstreamID string) error {
	url := fmt.Sprintf("%s/upstreams/%s", clusterURL, upstreamID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

func (c *kongClient) GetUpstreamHealth(ctx context.Context, clusterURL, token, upstreamID string) (*domain.KongUpstreamHealth, error) {
	url := fmt.Sprintf("%s/upstreams/%s/health", clusterURL, upstreamID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result domain.KongUpstreamHealth
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// -------------------------------------------------------------
// Targets
// -------------------------------------------------------------

func (c *kongClient) ListTargets(ctx context.Context, clusterURL, token, upstreamID string) ([]domain.KongTarget, error) {
	url := fmt.Sprintf("%s/upstreams/%s/targets", clusterURL, upstreamID)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongTarget `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateTarget(ctx context.Context, clusterURL, token, upstreamID string, target *domain.KongTarget) (*domain.KongTarget, error) {
	url := fmt.Sprintf("%s/upstreams/%s/targets", clusterURL, upstreamID)
	body, _ := json.Marshal(target)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongTarget
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteTarget(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	url := fmt.Sprintf("%s/upstreams/%s/targets/%s", clusterURL, upstreamID, targetID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

func (c *kongClient) SetTargetHealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	url := fmt.Sprintf("%s/upstreams/%s/targets/%s/healthy", clusterURL, upstreamID, targetID)
	_, err := c.doRequest(ctx, "PUT", url, token, bytes.NewBuffer([]byte("{}")))
	return err
}

func (c *kongClient) SetTargetUnhealthy(ctx context.Context, clusterURL, token, upstreamID, targetID string) error {
	url := fmt.Sprintf("%s/upstreams/%s/targets/%s/unhealthy", clusterURL, upstreamID, targetID)
	_, err := c.doRequest(ctx, "PUT", url, token, bytes.NewBuffer([]byte("{}")))
	return err
}

// -------------------------------------------------------------
// Certificates & SNIs & CA Certificates
// -------------------------------------------------------------

func (c *kongClient) ListCertificates(ctx context.Context, clusterURL, token string) ([]domain.KongCertificate, error) {
	url := fmt.Sprintf("%s/certificates", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongCertificate `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateCertificate(ctx context.Context, clusterURL, token string, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	url := fmt.Sprintf("%s/certificates", clusterURL)
	body, _ := json.Marshal(cert)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongCertificate
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) UpdateCertificate(ctx context.Context, clusterURL, token string, cert *domain.KongCertificate) (*domain.KongCertificate, error) {
	url := fmt.Sprintf("%s/certificates/%s", clusterURL, cert.ID)
	body, _ := json.Marshal(cert)
	data, err := c.doRequest(ctx, "PATCH", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var updated domain.KongCertificate
	if err := json.Unmarshal(data, &updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (c *kongClient) DeleteCertificate(ctx context.Context, clusterURL, token, certID string) error {
	url := fmt.Sprintf("%s/certificates/%s", clusterURL, certID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

func (c *kongClient) ListSNIs(ctx context.Context, clusterURL, token string) ([]domain.KongSNI, error) {
	url := fmt.Sprintf("%s/snis", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongSNI `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateSNI(ctx context.Context, clusterURL, token string, sni *domain.KongSNI) (*domain.KongSNI, error) {
	url := fmt.Sprintf("%s/snis", clusterURL)
	body, _ := json.Marshal(sni)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongSNI
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteSNI(ctx context.Context, clusterURL, token, sniName string) error {
	url := fmt.Sprintf("%s/snis/%s", clusterURL, sniName)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

func (c *kongClient) ListCACertificates(ctx context.Context, clusterURL, token string) ([]domain.KongCACertificate, error) {
	url := fmt.Sprintf("%s/ca_certificates", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []domain.KongCACertificate `json:"data"`
	}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func (c *kongClient) CreateCACertificate(ctx context.Context, clusterURL, token string, caCert *domain.KongCACertificate) (*domain.KongCACertificate, error) {
	url := fmt.Sprintf("%s/ca_certificates", clusterURL)
	body, _ := json.Marshal(caCert)
	data, err := c.doRequest(ctx, "POST", url, token, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	var created domain.KongCACertificate
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (c *kongClient) DeleteCACertificate(ctx context.Context, clusterURL, token, caCertID string) error {
	url := fmt.Sprintf("%s/ca_certificates/%s", clusterURL, caCertID)
	_, err := c.doRequest(ctx, "DELETE", url, token, nil)
	return err
}

// -------------------------------------------------------------
// Gateway Status & Node
// -------------------------------------------------------------

func (c *kongClient) GetStatus(ctx context.Context, clusterURL, token string) (*domain.KongStatus, error) {
	url := fmt.Sprintf("%s/status", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var status domain.KongStatus
	if err := json.Unmarshal(data, &status); err != nil {
		return nil, err
	}
	return &status, nil
}

func (c *kongClient) GetNodeInfo(ctx context.Context, clusterURL, token string) (*domain.KongNodeInfo, error) {
	url := fmt.Sprintf("%s/", clusterURL)
	data, err := c.doRequest(ctx, "GET", url, token, nil)
	if err != nil {
		return nil, err
	}

	var info domain.KongNodeInfo
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, err
	}
	return &info, nil
}
