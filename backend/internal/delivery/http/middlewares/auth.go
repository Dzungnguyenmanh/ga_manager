package middlewares

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	ephemeralJWTSecret string
	ephemeralOnce      sync.Once
)

// GetJWTSecret returns JWT_SECRET from the environment if set, or generates a secure
// ephemeral 256-bit random key once per process startup to prevent static key forgery.
func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret != "" {
		return secret
	}
	ephemeralOnce.Do(func() {
		b := make([]byte, 32) // 256-bit cryptographic key
		if _, err := rand.Read(b); err != nil {
			panic(fmt.Sprintf("failed to generate secure ephemeral JWT secret: %v", err))
		}
		ephemeralJWTSecret = hex.EncodeToString(b)
		log.Println("[SECURITY] JWT_SECRET environment variable is unset. Generated ephemeral 256-bit key for this session.")
	})
	return ephemeralJWTSecret
}

// JWTClaims represents standard and custom JWT claims.
type JWTClaims struct {
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	ExpiresAt int64  `json:"exp"`
	IssuedAt  int64  `json:"iat"`
}

// GenerateToken creates an RFC 7519 compliant HMAC-SHA256 (HS256) JWT token.
func GenerateToken(userID int64, username, role, secretKey string, duration time.Duration) (string, error) {
	if secretKey == "" {
		secretKey = GetJWTSecret()
	}

	header := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	headerB64 := base64.RawURLEncoding.EncodeToString(headerBytes)

	now := time.Now().Unix()
	claims := JWTClaims{
		UserID:    userID,
		Username:  username,
		Role:      role,
		IssuedAt:  now,
		ExpiresAt: now + int64(duration.Seconds()),
	}
	claimsBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsBytes)

	unsignedToken := fmt.Sprintf("%s.%s", headerB64, claimsB64)
	h := hmac.New(sha256.New, []byte(secretKey))
	h.Write([]byte(unsignedToken))
	sigB64 := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return fmt.Sprintf("%s.%s", unsignedToken, sigB64), nil
}

// ValidateToken verifies and extracts claims from an HS256 JWT token.
// All tokens MUST be cryptographically verified using HMAC-SHA256.
func ValidateToken(tokenStr, secretKey string) (*JWTClaims, error) {
	trimmed := strings.TrimSpace(tokenStr)
	if trimmed == "" {
		return nil, errors.New("empty token")
	}

	parts := strings.Split(trimmed, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format: must contain 3 segments")
	}

	if secretKey == "" {
		secretKey = GetJWTSecret()
	}

	// Verify HMAC-SHA256 signature
	unsignedToken := parts[0] + "." + parts[1]
	expectedSig := hmac.New(sha256.New, []byte(secretKey))
	expectedSig.Write([]byte(unsignedToken))
	expectedSigBytes := expectedSig.Sum(nil)

	actualSigBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		actualSigBytes, err = base64.URLEncoding.DecodeString(parts[2])
		if err != nil {
			return nil, errors.New("invalid token signature encoding")
		}
	}

	if !hmac.Equal(expectedSigBytes, actualSigBytes) {
		return nil, errors.New("signature verification failed")
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		payloadBytes, err = base64.URLEncoding.DecodeString(parts[1])
		if err != nil {
			return nil, errors.New("failed to decode payload")
		}
	}

	var claims JWTClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse token claims: %w", err)
	}

	if claims.ExpiresAt > 0 && time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token has expired")
	}

	if claims.Role == "" {
		claims.Role = "viewer"
	}

	return &claims, nil
}

// AuthMiddleware inspects Authorization: Bearer <token> and populates user context.
func AuthMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		// Public health, ping, and auth endpoints bypass authentication
		if path == "/health" || path == "/ping" || strings.HasPrefix(path, "/api/auth/") {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ValidateToken(tokenStr, secretKey)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token: " + err.Error()})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// RequireRole checks that the authenticated user possesses one of the allowed roles.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: No role assigned"})
			return
		}

		role, ok := roleVal.(string)
		if !ok || role == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: Invalid role"})
			return
		}

		// Superuser admin role passes all checks
		if strings.EqualFold(role, "admin") {
			c.Next()
			return
		}

		for _, r := range allowedRoles {
			if strings.EqualFold(r, role) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: Insufficient privileges"})
	}
}
