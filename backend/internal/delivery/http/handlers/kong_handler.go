package handlers

import (
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kong-manager-backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/goccy/go-yaml"
)

type KongHandler struct {
	Usecase   domain.KongUsecase
	AuditRepo domain.AuditRepository
}

func NewKongHandler(u domain.KongUsecase, auditRepo domain.AuditRepository) *KongHandler {
	return &KongHandler{Usecase: u, AuditRepo: auditRepo}
}

func (h *KongHandler) getClusterID(c *gin.Context) int32 {
	val, exists := c.Get("clusterID")
	if !exists {
		return 0
	}
	return val.(int32)
}

func (h *KongHandler) recordAudit(c *gin.Context, clusterID int32, action, resource, resourceID string, details map[string]any) {
	if h.AuditRepo == nil {
		return
	}
	username := c.GetHeader("X-User-Name")
	if username == "" {
		username = "operator"
	}
	if details == nil {
		details = make(map[string]any)
	}
	details["source_ip"] = c.ClientIP()

	for k, v := range details {
		kLower := strings.ToLower(k)
		if strings.Contains(kLower, "key") || strings.Contains(kLower, "secret") || strings.Contains(kLower, "password") {
			if strVal, ok := v.(string); ok && strVal != "" {
				details[k] = "********"
			}
		}
	}

	cid := clusterID
	auditLog := &domain.AuditLog{
		ClusterID:  &cid,
		Username:   username,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
		CreatedAt:  time.Now(),
	}

	_ = h.AuditRepo.Create(c.Request.Context(), auditLog)
}

// -------------------------------------------------------------
// Services
// -------------------------------------------------------------

func (h *KongHandler) ListServices(c *gin.Context) {
	clusterID := h.getClusterID(c)
	services, err := h.Usecase.ListServices(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, services)
}

func (h *KongHandler) CreateService(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var svc domain.KongService
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateService(c.Request.Context(), clusterID, &svc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "service", created.ID, map[string]any{"name": created.Name, "host": created.Host})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdateService(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var svc domain.KongService
	if err := c.ShouldBindJSON(&svc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	svc.ID = c.Param("serviceId")

	updated, err := h.Usecase.UpdateService(c.Request.Context(), clusterID, &svc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "service", updated.ID, map[string]any{"name": updated.Name, "host": updated.Host})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeleteService(c *gin.Context) {
	clusterID := h.getClusterID(c)
	serviceID := c.Param("serviceId")

	if err := h.Usecase.DeleteService(c.Request.Context(), clusterID, serviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "service", serviceID, nil)
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------

func (h *KongHandler) ListRoutes(c *gin.Context) {
	clusterID := h.getClusterID(c)
	routes, err := h.Usecase.ListRoutes(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, routes)
}

func (h *KongHandler) CreateRoute(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var route domain.KongRoute
	if err := c.ShouldBindJSON(&route); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateRoute(c.Request.Context(), clusterID, &route)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "route", created.ID, map[string]any{"name": created.Name, "paths": created.Paths})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdateRoute(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var route domain.KongRoute
	if err := c.ShouldBindJSON(&route); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	route.ID = c.Param("routeId")

	updated, err := h.Usecase.UpdateRoute(c.Request.Context(), clusterID, &route)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "route", updated.ID, map[string]any{"name": updated.Name, "paths": updated.Paths})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeleteRoute(c *gin.Context) {
	clusterID := h.getClusterID(c)
	routeID := c.Param("routeId")

	if err := h.Usecase.DeleteRoute(c.Request.Context(), clusterID, routeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "route", routeID, nil)
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Consumers
// -------------------------------------------------------------

func (h *KongHandler) ListConsumers(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumers, err := h.Usecase.ListConsumers(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, consumers)
}

func (h *KongHandler) CreateConsumer(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var consumer domain.KongConsumer
	if err := c.ShouldBindJSON(&consumer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateConsumer(c.Request.Context(), clusterID, &consumer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "consumer", created.ID, map[string]any{"username": created.Username})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdateConsumer(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var consumer domain.KongConsumer
	if err := c.ShouldBindJSON(&consumer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	consumer.ID = c.Param("consumerId")

	updated, err := h.Usecase.UpdateConsumer(c.Request.Context(), clusterID, &consumer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "consumer", updated.ID, map[string]any{"username": updated.Username})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeleteConsumer(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")

	if err := h.Usecase.DeleteConsumer(c.Request.Context(), clusterID, consumerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "consumer", consumerID, nil)
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Consumer Credentials & ACLs
// -------------------------------------------------------------

// KeyAuth
func (h *KongHandler) ListKeyAuths(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	keys, err := h.Usecase.ListKeyAuths(c.Request.Context(), clusterID, consumerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

func (h *KongHandler) CreateKeyAuth(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	var key domain.KongKeyAuth
	if err := c.ShouldBindJSON(&key); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.Usecase.CreateKeyAuth(c.Request.Context(), clusterID, consumerID, &key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "key-auth", created.ID, map[string]any{"consumer_id": consumerID})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteKeyAuth(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	keyID := c.Param("keyId")
	if err := h.Usecase.DeleteKeyAuth(c.Request.Context(), clusterID, consumerID, keyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "key-auth", keyID, map[string]any{"consumer_id": consumerID})
	c.Status(http.StatusNoContent)
}

// JWT
func (h *KongHandler) ListJWTs(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	jwts, err := h.Usecase.ListJWTs(c.Request.Context(), clusterID, consumerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, jwts)
}

func (h *KongHandler) CreateJWT(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	var jwt domain.KongJWT
	if err := c.ShouldBindJSON(&jwt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.Usecase.CreateJWT(c.Request.Context(), clusterID, consumerID, &jwt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteJWT(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	jwtID := c.Param("jwtId")
	if err := h.Usecase.DeleteJWT(c.Request.Context(), clusterID, consumerID, jwtID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// BasicAuth
func (h *KongHandler) ListBasicAuths(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	auths, err := h.Usecase.ListBasicAuths(c.Request.Context(), clusterID, consumerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auths)
}

func (h *KongHandler) CreateBasicAuth(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	var auth domain.KongBasicAuth
	if err := c.ShouldBindJSON(&auth); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.Usecase.CreateBasicAuth(c.Request.Context(), clusterID, consumerID, &auth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteBasicAuth(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	authID := c.Param("authId")
	if err := h.Usecase.DeleteBasicAuth(c.Request.Context(), clusterID, consumerID, authID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ACLs
func (h *KongHandler) ListACLs(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	acls, err := h.Usecase.ListACLs(c.Request.Context(), clusterID, consumerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, acls)
}

func (h *KongHandler) CreateACL(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	var acl domain.KongACL
	if err := c.ShouldBindJSON(&acl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	created, err := h.Usecase.CreateACL(c.Request.Context(), clusterID, consumerID, &acl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteACL(c *gin.Context) {
	clusterID := h.getClusterID(c)
	consumerID := c.Param("consumerId")
	aclID := c.Param("aclId")
	if err := h.Usecase.DeleteACL(c.Request.Context(), clusterID, consumerID, aclID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Plugins
// -------------------------------------------------------------

func (h *KongHandler) ListPlugins(c *gin.Context) {
	clusterID := h.getClusterID(c)
	plugins, err := h.Usecase.ListPlugins(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, plugins)
}

func (h *KongHandler) CreatePlugin(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var plugin domain.KongPlugin
	if err := c.ShouldBindJSON(&plugin); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreatePlugin(c.Request.Context(), clusterID, &plugin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "plugin", created.ID, map[string]any{"name": created.Name})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdatePlugin(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var plugin domain.KongPlugin
	if err := c.ShouldBindJSON(&plugin); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	plugin.ID = c.Param("pluginId")

	updated, err := h.Usecase.UpdatePlugin(c.Request.Context(), clusterID, &plugin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "plugin", updated.ID, map[string]any{"name": updated.Name})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeletePlugin(c *gin.Context) {
	clusterID := h.getClusterID(c)
	pluginID := c.Param("pluginId")

	if err := h.Usecase.DeletePlugin(c.Request.Context(), clusterID, pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "plugin", pluginID, nil)
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Upstreams
// -------------------------------------------------------------

func (h *KongHandler) ListUpstreams(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreams, err := h.Usecase.ListUpstreams(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, upstreams)
}

func (h *KongHandler) CreateUpstream(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var upstream domain.KongUpstream
	if err := c.ShouldBindJSON(&upstream); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateUpstream(c.Request.Context(), clusterID, &upstream)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "upstream", created.ID, map[string]any{"name": created.Name})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdateUpstream(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var upstream domain.KongUpstream
	if err := c.ShouldBindJSON(&upstream); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	upstream.ID = c.Param("upstreamId")

	updated, err := h.Usecase.UpdateUpstream(c.Request.Context(), clusterID, &upstream)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "upstream", updated.ID, map[string]any{"name": updated.Name})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeleteUpstream(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")

	if err := h.Usecase.DeleteUpstream(c.Request.Context(), clusterID, upstreamID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "upstream", upstreamID, nil)
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Targets
// -------------------------------------------------------------

func (h *KongHandler) ListTargets(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")

	targets, err := h.Usecase.ListTargets(c.Request.Context(), clusterID, upstreamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, targets)
}

func (h *KongHandler) CreateTarget(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")

	var target domain.KongTarget
	if err := c.ShouldBindJSON(&target); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateTarget(c.Request.Context(), clusterID, upstreamID, &target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteTarget(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")
	targetID := c.Param("targetId")

	if err := h.Usecase.DeleteTarget(c.Request.Context(), clusterID, upstreamID, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *KongHandler) GetUpstreamHealth(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")

	health, err := h.Usecase.GetUpstreamHealth(c.Request.Context(), clusterID, upstreamID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, health)
}

func (h *KongHandler) SetTargetHealthy(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")
	targetID := c.Param("targetId")

	if err := h.Usecase.SetTargetHealthy(c.Request.Context(), clusterID, upstreamID, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *KongHandler) SetTargetUnhealthy(c *gin.Context) {
	clusterID := h.getClusterID(c)
	upstreamID := c.Param("upstreamId")
	targetID := c.Param("targetId")

	if err := h.Usecase.SetTargetUnhealthy(c.Request.Context(), clusterID, upstreamID, targetID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Certificates & SNIs & CA Certificates
// -------------------------------------------------------------

func (h *KongHandler) ListCertificates(c *gin.Context) {
	clusterID := h.getClusterID(c)
	certs, err := h.Usecase.ListCertificates(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, certs)
}

func (h *KongHandler) CreateCertificate(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var cert domain.KongCertificate
	if err := c.ShouldBindJSON(&cert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateCertificate(c.Request.Context(), clusterID, &cert)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "certificate", created.ID, map[string]any{"snis": created.SNIs})
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) UpdateCertificate(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var cert domain.KongCertificate
	if err := c.ShouldBindJSON(&cert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cert.ID = c.Param("certId")

	updated, err := h.Usecase.UpdateCertificate(c.Request.Context(), clusterID, &cert)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "UPDATE", "certificate", updated.ID, map[string]any{"snis": updated.SNIs})
	c.JSON(http.StatusOK, updated)
}

func (h *KongHandler) DeleteCertificate(c *gin.Context) {
	clusterID := h.getClusterID(c)
	certID := c.Param("certId")

	if err := h.Usecase.DeleteCertificate(c.Request.Context(), clusterID, certID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "DELETE", "certificate", certID, nil)
	c.Status(http.StatusNoContent)
}

func (h *KongHandler) ListSNIs(c *gin.Context) {
	clusterID := h.getClusterID(c)
	snis, err := h.Usecase.ListSNIs(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, snis)
}

func (h *KongHandler) CreateSNI(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var sni domain.KongSNI
	if err := c.ShouldBindJSON(&sni); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateSNI(c.Request.Context(), clusterID, &sni)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteSNI(c *gin.Context) {
	clusterID := h.getClusterID(c)
	sniName := c.Param("sniName")

	if err := h.Usecase.DeleteSNI(c.Request.Context(), clusterID, sniName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *KongHandler) ListCACertificates(c *gin.Context) {
	clusterID := h.getClusterID(c)
	caCerts, err := h.Usecase.ListCACertificates(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, caCerts)
}

func (h *KongHandler) CreateCACertificate(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var caCert domain.KongCACertificate
	if err := c.ShouldBindJSON(&caCert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created, err := h.Usecase.CreateCACertificate(c.Request.Context(), clusterID, &caCert)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *KongHandler) DeleteCACertificate(c *gin.Context) {
	clusterID := h.getClusterID(c)
	caCertID := c.Param("caCertId")

	if err := h.Usecase.DeleteCACertificate(c.Request.Context(), clusterID, caCertID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// -------------------------------------------------------------
// Gateway Status & Node
// -------------------------------------------------------------

func (h *KongHandler) GetStatus(c *gin.Context) {
	clusterID := h.getClusterID(c)
	status, err := h.Usecase.GetStatus(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *KongHandler) GetNodeInfo(c *gin.Context) {
	clusterID := h.getClusterID(c)
	info, err := h.Usecase.GetNodeInfo(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// -------------------------------------------------------------
// Declarative GitOps & Snapshots
// -------------------------------------------------------------

func (h *KongHandler) DumpDeclarativeConfig(c *gin.Context) {
	clusterID := h.getClusterID(c)
	cfg, err := h.Usecase.DumpDeclarativeConfig(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Secret masking protection for production
	maskSecrets := c.DefaultQuery("mask_secrets", "true") == "true"
	if maskSecrets {
		for i := range cfg.Consumers {
			for j := range cfg.Consumers[i].KeyAuthCredentials {
				cfg.Consumers[i].KeyAuthCredentials[j].Key = "********"
			}
			for j := range cfg.Consumers[i].JWTCredentials {
				cfg.Consumers[i].JWTCredentials[j].Secret = "********"
			}
			for j := range cfg.Consumers[i].BasicAuthCredentials {
				cfg.Consumers[i].BasicAuthCredentials[j].Password = "********"
			}
		}
		for i := range cfg.Certificates {
			if cfg.Certificates[i].Key != "" {
				cfg.Certificates[i].Key = "[REDACTED_PRIVATE_KEY]"
			}
		}
	}

	format := c.DefaultQuery("format", "json")
	if format == "yaml" || format == "yml" {
		yamlData, err := yaml.Marshal(cfg)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Header("Content-Type", "application/x-yaml")
		c.String(http.StatusOK, string(yamlData))
		return
	}

	c.JSON(http.StatusOK, cfg)
}

func (h *KongHandler) SyncDeclarativeConfig(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var config domain.KongDeclarativeConfig

	contentType := c.GetHeader("Content-Type")
	if contentType == "application/x-yaml" || contentType == "text/yaml" {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := yaml.Unmarshal(bodyBytes, &config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML: " + err.Error()})
			return
		}
	} else {
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
			return
		}
	}

	summary, err := h.Usecase.SyncDeclarativeConfig(c.Request.Context(), clusterID, &config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "SYNC_GITOPS", "declarative", "", map[string]any{"status": "success"})
	c.JSON(http.StatusOK, summary)
}

func (h *KongHandler) DiffDeclarativeConfig(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var config domain.KongDeclarativeConfig

	contentType := c.GetHeader("Content-Type")
	if contentType == "application/x-yaml" || contentType == "text/yaml" {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := yaml.Unmarshal(bodyBytes, &config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML: " + err.Error()})
			return
		}
	} else {
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
			return
		}
	}

	summary, err := h.Usecase.DiffDeclarativeConfig(c.Request.Context(), clusterID, &config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *KongHandler) CreateSnapshot(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snap, err := h.Usecase.CreateSnapshot(c.Request.Context(), clusterID, req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "CREATE", "snapshot", strconv.FormatInt(snap.ID, 10), map[string]any{"name": snap.Name})
	c.JSON(http.StatusCreated, snap)
}

func (h *KongHandler) ListSnapshots(c *gin.Context) {
	clusterID := h.getClusterID(c)
	snaps, err := h.Usecase.ListSnapshots(c.Request.Context(), clusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, snaps)
}

func (h *KongHandler) RestoreSnapshot(c *gin.Context) {
	clusterID := h.getClusterID(c)
	snapshotIDStr := c.Param("snapshotId")
	snapshotID, err := strconv.ParseInt(snapshotIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid snapshot ID"})
		return
	}

	summary, err := h.Usecase.RestoreSnapshot(c.Request.Context(), clusterID, snapshotID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, clusterID, "RESTORE_SNAPSHOT", "snapshot", snapshotIDStr, map[string]any{"status": "restored"})
	c.JSON(http.StatusOK, summary)
}

func (h *KongHandler) DeleteSnapshot(c *gin.Context) {
	snapshotIDStr := c.Param("snapshotId")
	snapshotID, err := strconv.ParseInt(snapshotIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid snapshot ID"})
		return
	}

	if err := h.Usecase.DeleteSnapshot(c.Request.Context(), snapshotID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *KongHandler) TestRequest(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var req domain.TestRequestInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.Usecase.TestRequest(c.Request.Context(), clusterID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *KongHandler) ListAuditLogs(c *gin.Context) {
	var clusterIDPtr *int32
	if clusterIDStr := c.Query("cluster_id"); clusterIDStr != "" {
		if id, err := strconv.Atoi(clusterIDStr); err == nil && id > 0 {
			cid := int32(id)
			clusterIDPtr = &cid
		}
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if h.AuditRepo == nil {
		c.JSON(http.StatusOK, gin.H{"logs": []domain.AuditLog{}, "total": 0})
		return
	}

	logs, total, err := h.AuditRepo.List(c.Request.Context(), clusterIDPtr, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": total,
	})
}

func (h *KongHandler) RunDiagnostics(c *gin.Context) {
	clusterID := h.getClusterID(c)
	var input domain.DiagnosticsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.Usecase.RunDiagnostics(c.Request.Context(), clusterID, &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

type PromoteRequest struct {
	SourceClusterID int32 `json:"source_cluster_id" binding:"required"`
	TargetClusterID int32 `json:"target_cluster_id" binding:"required"`
}

func (h *KongHandler) PromoteConfig(c *gin.Context) {
	var req PromoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.Usecase.PromoteConfig(c.Request.Context(), req.SourceClusterID, req.TargetClusterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.recordAudit(c, req.TargetClusterID, "PROMOTE_CONFIG", "cluster", strconv.Itoa(int(req.SourceClusterID)), map[string]any{"source_cluster_id": req.SourceClusterID, "target_cluster_id": req.TargetClusterID})
	c.JSON(http.StatusOK, result)
}

