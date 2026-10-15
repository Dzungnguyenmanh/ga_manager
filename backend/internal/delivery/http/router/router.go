package router

import (
	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/middlewares"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	clusterHandler *handlers.ClusterHandler,
	kongHandler *handlers.KongHandler,
) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Kong-Cluster-Id, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	api := r.Group("/api")

	// Cluster management routes (no cluster ID required)
	clusters := api.Group("/clusters")
	{
		clusters.GET("", clusterHandler.List)
		clusters.POST("", clusterHandler.Create)
		clusters.GET("/:id", clusterHandler.GetByID)
		clusters.PATCH("/:id", clusterHandler.Update)
		clusters.DELETE("/:id", clusterHandler.Delete)
		clusters.POST("/promote", kongHandler.PromoteConfig)
	}

	// Kong proxy routes (requires cluster ID header)
	kong := api.Group("/kong")
	kong.Use(middlewares.ClusterIDMiddleware())
	{
		// Services
		kong.GET("/services", kongHandler.ListServices)
		kong.POST("/services", kongHandler.CreateService)
		kong.PATCH("/services/:serviceId", kongHandler.UpdateService)
		kong.DELETE("/services/:serviceId", kongHandler.DeleteService)
		
		// Routes
		kong.GET("/routes", kongHandler.ListRoutes)
		kong.POST("/routes", kongHandler.CreateRoute)
		kong.PATCH("/routes/:routeId", kongHandler.UpdateRoute)
		kong.DELETE("/routes/:routeId", kongHandler.DeleteRoute)

		// Consumers
		kong.GET("/consumers", kongHandler.ListConsumers)
		kong.POST("/consumers", kongHandler.CreateConsumer)
		kong.PATCH("/consumers/:consumerId", kongHandler.UpdateConsumer)
		kong.DELETE("/consumers/:consumerId", kongHandler.DeleteConsumer)

		// Consumer Credentials & ACLs
		kong.GET("/consumers/:consumerId/key-auth", kongHandler.ListKeyAuths)
		kong.POST("/consumers/:consumerId/key-auth", kongHandler.CreateKeyAuth)
		kong.DELETE("/consumers/:consumerId/key-auth/:keyId", kongHandler.DeleteKeyAuth)

		kong.GET("/consumers/:consumerId/jwt", kongHandler.ListJWTs)
		kong.POST("/consumers/:consumerId/jwt", kongHandler.CreateJWT)
		kong.DELETE("/consumers/:consumerId/jwt/:jwtId", kongHandler.DeleteJWT)

		kong.GET("/consumers/:consumerId/basic-auth", kongHandler.ListBasicAuths)
		kong.POST("/consumers/:consumerId/basic-auth", kongHandler.CreateBasicAuth)
		kong.DELETE("/consumers/:consumerId/basic-auth/:authId", kongHandler.DeleteBasicAuth)

		kong.GET("/consumers/:consumerId/acls", kongHandler.ListACLs)
		kong.POST("/consumers/:consumerId/acls", kongHandler.CreateACL)
		kong.DELETE("/consumers/:consumerId/acls/:aclId", kongHandler.DeleteACL)

		// Plugins
		kong.GET("/plugins", kongHandler.ListPlugins)
		kong.POST("/plugins", kongHandler.CreatePlugin)
		kong.PATCH("/plugins/:pluginId", kongHandler.UpdatePlugin)
		kong.DELETE("/plugins/:pluginId", kongHandler.DeletePlugin)

		// Upstreams
		kong.GET("/upstreams", kongHandler.ListUpstreams)
		kong.POST("/upstreams", kongHandler.CreateUpstream)
		kong.PATCH("/upstreams/:upstreamId", kongHandler.UpdateUpstream)
		kong.DELETE("/upstreams/:upstreamId", kongHandler.DeleteUpstream)
		kong.GET("/upstreams/:upstreamId/health", kongHandler.GetUpstreamHealth)

		// Targets
		kong.GET("/upstreams/:upstreamId/targets", kongHandler.ListTargets)
		kong.POST("/upstreams/:upstreamId/targets", kongHandler.CreateTarget)
		kong.DELETE("/upstreams/:upstreamId/targets/:targetId", kongHandler.DeleteTarget)
		kong.POST("/upstreams/:upstreamId/targets/:targetId/healthy", kongHandler.SetTargetHealthy)
		kong.PUT("/upstreams/:upstreamId/targets/:targetId/healthy", kongHandler.SetTargetHealthy)
		kong.POST("/upstreams/:upstreamId/targets/:targetId/unhealthy", kongHandler.SetTargetUnhealthy)
		kong.PUT("/upstreams/:upstreamId/targets/:targetId/unhealthy", kongHandler.SetTargetUnhealthy)

		// Certificates & SNIs & CA Certificates
		kong.GET("/certificates", kongHandler.ListCertificates)
		kong.POST("/certificates", kongHandler.CreateCertificate)
		kong.PATCH("/certificates/:certId", kongHandler.UpdateCertificate)
		kong.DELETE("/certificates/:certId", kongHandler.DeleteCertificate)

		kong.GET("/snis", kongHandler.ListSNIs)
		kong.POST("/snis", kongHandler.CreateSNI)
		kong.DELETE("/snis/:sniName", kongHandler.DeleteSNI)

		kong.GET("/ca-certificates", kongHandler.ListCACertificates)
		kong.POST("/ca-certificates", kongHandler.CreateCACertificate)
		kong.DELETE("/ca-certificates/:caCertId", kongHandler.DeleteCACertificate)

		// Gateway Status & Node
		kong.GET("/status", kongHandler.GetStatus)
		kong.GET("/node", kongHandler.GetNodeInfo)

		// Declarative GitOps & Snapshots
		kong.GET("/declarative/dump", kongHandler.DumpDeclarativeConfig)
		kong.POST("/declarative/diff", kongHandler.DiffDeclarativeConfig)
		kong.POST("/declarative/sync", kongHandler.SyncDeclarativeConfig)
		kong.GET("/snapshots", kongHandler.ListSnapshots)
		kong.POST("/snapshots", kongHandler.CreateSnapshot)
		kong.POST("/snapshots/:snapshotId/restore", kongHandler.RestoreSnapshot)
		kong.DELETE("/snapshots/:snapshotId", kongHandler.DeleteSnapshot)

		// Operational Diagnostics & Request Testing
		kong.POST("/test-request", kongHandler.TestRequest)
		kong.POST("/diagnostics", kongHandler.RunDiagnostics)
	}

	// Audit Logs
	api.GET("/audit-logs", kongHandler.ListAuditLogs)

	return r
}
