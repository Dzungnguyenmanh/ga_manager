package middlewares

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// SecurityHeadersMiddleware sets strict CORS policies and HTTP security response headers.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowedOriginEnv := os.Getenv("CORS_ALLOWED_ORIGIN")
		if allowedOriginEnv == "" {
			allowedOriginEnv = "https://kong.hmisp.com.vn"
		}

		// Handle origin matching
		if allowedOriginEnv == "*" {
			if origin != "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			allowedOrigins := strings.Split(allowedOriginEnv, ",")
			matched := false
			for _, allowed := range allowedOrigins {
				allowed = strings.TrimSpace(allowed)
				if allowed != "" && (origin == allowed || strings.EqualFold(origin, allowed)) {
					c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
					c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
					matched = true
					break
				}
			}
			if !matched && origin == "" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", strings.TrimSpace(allowedOrigins[0]))
			}
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Kong-Cluster-Id, Authorization, X-User-Name")

		// Security Headers (VULN-09)
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Handle CORS Preflight
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
