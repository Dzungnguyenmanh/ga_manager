package router

import (
	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/middlewares"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	clusterHandler *handlers.ClusterHandler,
	kongHandler *handlers.KongHandler,
	authHandler *handlers.AuthHandler,
) *gin.Engine {
	r := gin.Default()

	// 1. CORS & Security Response Headers (VULN-08, VULN-09)
	r.Use(middlewares.SecurityHeadersMiddleware())

	// 2. Health & Diagnostic Ping endpoints (unauthenticated for K8s probes and monitoring)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 3. Public Auth Routes (unauthenticated login endpoint)
	if authHandler != nil {
		authGroup := r.Group("/api/auth")
		{
			authGroup.POST("/login", authHandler.Login)
		}
	}

	// 4. Authenticated API Group with JWT Middleware & RBAC (VULN-04)
	jwtSecret := middlewares.GetJWTSecret()
	api := r.Group("/api")
	api.Use(middlewares.AuthMiddleware(jwtSecret))

	// Cluster management routes (no cluster ID required)
	clusters := api.Group("/clusters")
	{
		clusters.GET("", clusterHandler.List)
		clusters.POST("", middlewares.RequireRole("admin", "operator"), clusterHandler.Create)
		clusters.GET("/:id", clusterHandler.GetByID)
		clusters.PATCH("/:id", middlewares.RequireRole("admin", "operator"), clusterHandler.Update)
		clusters.DELETE("/:id", middlewares.RequireRole("admin"), clusterHandler.Delete)
		clusters.POST("/promote", middlewares.RequireRole("admin"), kongHandler.PromoteConfig)
	}

	// Kong proxy routes (requires cluster ID header)
	kong := api.Group("/kong")
	kong.Use(middlewares.ClusterIDMiddleware())
	{
		// Services
		kong.GET("/services", kongHandler.ListServices)
		kong.POST("/services", middlewares.RequireRole("admin", "operator"), kongHandler.CreateService)
		kong.PATCH("/services/:serviceId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdateService)
		kong.DELETE("/services/:serviceId", middlewares.RequireRole("admin"), kongHandler.DeleteService)

		// Routes
		kong.GET("/routes", kongHandler.ListRoutes)
		kong.POST("/routes", middlewares.RequireRole("admin", "operator"), kongHandler.CreateRoute)
		kong.PATCH("/routes/:routeId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdateRoute)
		kong.DELETE("/routes/:routeId", middlewares.RequireRole("admin"), kongHandler.DeleteRoute)

		// Consumers
		kong.GET("/consumers", kongHandler.ListConsumers)
		kong.POST("/consumers", middlewares.RequireRole("admin", "operator"), kongHandler.CreateConsumer)
		kong.PATCH("/consumers/:consumerId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdateConsumer)
		kong.DELETE("/consumers/:consumerId", middlewares.RequireRole("admin"), kongHandler.DeleteConsumer)

		// Consumer Credentials & ACLs
		kong.GET("/consumers/:consumerId/key-auth", kongHandler.ListKeyAuths)
		kong.POST("/consumers/:consumerId/key-auth", middlewares.RequireRole("admin", "operator"), kongHandler.CreateKeyAuth)
		kong.DELETE("/consumers/:consumerId/key-auth/:keyId", middlewares.RequireRole("admin"), kongHandler.DeleteKeyAuth)

		kong.GET("/consumers/:consumerId/jwt", kongHandler.ListJWTs)
		kong.POST("/consumers/:consumerId/jwt", middlewares.RequireRole("admin", "operator"), kongHandler.CreateJWT)
		kong.DELETE("/consumers/:consumerId/jwt/:jwtId", middlewares.RequireRole("admin"), kongHandler.DeleteJWT)

		kong.GET("/consumers/:consumerId/basic-auth", kongHandler.ListBasicAuths)
		kong.POST("/consumers/:consumerId/basic-auth", middlewares.RequireRole("admin", "operator"), kongHandler.CreateBasicAuth)
		kong.DELETE("/consumers/:consumerId/basic-auth/:authId", middlewares.RequireRole("admin"), kongHandler.DeleteBasicAuth)

		kong.GET("/consumers/:consumerId/acls", kongHandler.ListACLs)
		kong.POST("/consumers/:consumerId/acls", middlewares.RequireRole("admin", "operator"), kongHandler.CreateACL)
		kong.DELETE("/consumers/:consumerId/acls/:aclId", middlewares.RequireRole("admin"), kongHandler.DeleteACL)

		// Plugins
		kong.GET("/plugins", kongHandler.ListPlugins)
		kong.POST("/plugins", middlewares.RequireRole("admin", "operator"), kongHandler.CreatePlugin)
		kong.PATCH("/plugins/:pluginId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdatePlugin)
		kong.DELETE("/plugins/:pluginId", middlewares.RequireRole("admin"), kongHandler.DeletePlugin)

		// Upstreams
		kong.GET("/upstreams", kongHandler.ListUpstreams)
		kong.POST("/upstreams", middlewares.RequireRole("admin", "operator"), kongHandler.CreateUpstream)
		kong.PATCH("/upstreams/:upstreamId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdateUpstream)
		kong.DELETE("/upstreams/:upstreamId", middlewares.RequireRole("admin"), kongHandler.DeleteUpstream)
		kong.GET("/upstreams/:upstreamId/health", kongHandler.GetUpstreamHealth)

		// Targets
		kong.GET("/upstreams/:upstreamId/targets", kongHandler.ListTargets)
		kong.POST("/upstreams/:upstreamId/targets", middlewares.RequireRole("admin", "operator"), kongHandler.CreateTarget)
		kong.DELETE("/upstreams/:upstreamId/targets/:targetId", middlewares.RequireRole("admin"), kongHandler.DeleteTarget)
		kong.POST("/upstreams/:upstreamId/targets/:targetId/healthy", middlewares.RequireRole("admin", "operator"), kongHandler.SetTargetHealthy)
		kong.PUT("/upstreams/:upstreamId/targets/:targetId/healthy", middlewares.RequireRole("admin", "operator"), kongHandler.SetTargetHealthy)
		kong.POST("/upstreams/:upstreamId/targets/:targetId/unhealthy", middlewares.RequireRole("admin", "operator"), kongHandler.SetTargetUnhealthy)
		kong.PUT("/upstreams/:upstreamId/targets/:targetId/unhealthy", middlewares.RequireRole("admin", "operator"), kongHandler.SetTargetUnhealthy)

		// Certificates & SNIs & CA Certificates
		kong.GET("/certificates", kongHandler.ListCertificates)
		kong.POST("/certificates", middlewares.RequireRole("admin", "operator"), kongHandler.CreateCertificate)
		kong.PATCH("/certificates/:certId", middlewares.RequireRole("admin", "operator"), kongHandler.UpdateCertificate)
		kong.DELETE("/certificates/:certId", middlewares.RequireRole("admin"), kongHandler.DeleteCertificate)

		kong.GET("/snis", kongHandler.ListSNIs)
		kong.POST("/snis", middlewares.RequireRole("admin", "operator"), kongHandler.CreateSNI)
		kong.DELETE("/snis/:sniName", middlewares.RequireRole("admin"), kongHandler.DeleteSNI)

		kong.GET("/ca-certificates", kongHandler.ListCACertificates)
		kong.POST("/ca-certificates", middlewares.RequireRole("admin", "operator"), kongHandler.CreateCACertificate)
		kong.DELETE("/ca-certificates/:caCertId", middlewares.RequireRole("admin"), kongHandler.DeleteCACertificate)

		// Gateway Status & Node
		kong.GET("/status", kongHandler.GetStatus)
		kong.GET("/node", kongHandler.GetNodeInfo)

		// Declarative GitOps & Snapshots
		kong.GET("/declarative/dump", kongHandler.DumpDeclarativeConfig)
		kong.POST("/declarative/diff", middlewares.RequireRole("admin", "operator"), kongHandler.DiffDeclarativeConfig)
		kong.POST("/declarative/sync", middlewares.RequireRole("admin"), kongHandler.SyncDeclarativeConfig)
		kong.GET("/snapshots", kongHandler.ListSnapshots)
		kong.POST("/snapshots", middlewares.RequireRole("admin", "operator"), kongHandler.CreateSnapshot)
		kong.POST("/snapshots/:snapshotId/restore", middlewares.RequireRole("admin"), kongHandler.RestoreSnapshot)
		kong.DELETE("/snapshots/:snapshotId", middlewares.RequireRole("admin"), kongHandler.DeleteSnapshot)

		// Operational Diagnostics & Request Testing
		kong.POST("/test-request", middlewares.RequireRole("admin", "operator"), kongHandler.TestRequest)
		kong.POST("/diagnostics", middlewares.RequireRole("admin", "operator"), kongHandler.RunDiagnostics)
	}

	// Audit Logs
	api.GET("/audit-logs", kongHandler.ListAuditLogs)

	return r
}
