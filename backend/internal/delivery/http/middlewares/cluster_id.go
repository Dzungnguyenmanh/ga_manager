package middlewares

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ClusterIDMiddleware extracts the X-Kong-Cluster-Id header and sets it in context
func ClusterIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clusterIDStr := c.GetHeader("X-Kong-Cluster-Id")
		if clusterIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "X-Kong-Cluster-Id header is required"})
			c.Abort()
			return
		}

		clusterID, err := strconv.ParseInt(clusterIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid X-Kong-Cluster-Id format"})
			c.Abort()
			return
		}

		c.Set("clusterID", int32(clusterID))
		c.Next()
	}
}
