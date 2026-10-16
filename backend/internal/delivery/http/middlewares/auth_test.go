package middlewares_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"kong-manager-backend/internal/delivery/http/middlewares"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestTokenGenerationAndValidation(t *testing.T) {
	secret := "test-jwt-secret-key-12345"

	// 1. Valid token
	token, err := middlewares.GenerateToken(42, "tester", "operator", secret, 1*time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := middlewares.ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.UserID != 42 || claims.Username != "tester" || claims.Role != "operator" {
		t.Errorf("Unexpected claims: %+v", claims)
	}

	// 2. Tampered token signature
	tamperedToken := token + "tampered"
	if _, err := middlewares.ValidateToken(tamperedToken, secret); err == nil {
		t.Error("Expected signature verification failure for tampered token")
	}

	// 3. Expired token
	expiredToken, err := middlewares.GenerateToken(10, "olduser", "viewer", secret, -1*time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed for expired token: %v", err)
	}
	if _, err := middlewares.ValidateToken(expiredToken, secret); err == nil {
		t.Error("Expected error for expired token, got nil")
	}

	// 4. Mock / Demo token MUST be strictly rejected (Integrity Rule)
	mockTokens := []string{
		"mock-jwt-token-123",
		"jwt-token-local-demo-123",
		"sso-hmisp-token-xyz789",
	}
	for _, mockTok := range mockTokens {
		if _, err := middlewares.ValidateToken(mockTok, secret); err == nil {
			t.Errorf("Security Violation: mock token '%s' must not validate without cryptographic signature", mockTok)
		}
	}
}

func TestEphemeralJWTSecret(t *testing.T) {
	// If JWT_SECRET is unset, GetJWTSecret() must return a non-empty 64-character hex string (256 bits)
	secret := middlewares.GetJWTSecret()
	if len(secret) < 32 {
		t.Errorf("Expected ephemeral JWT secret of at least 32 chars, got length %d", len(secret))
	}

	// Token generated with ephemeral key must validate with same key
	tok, err := middlewares.GenerateToken(1, "admin", "admin", "", 1*time.Hour)
	if err != nil {
		t.Fatalf("Failed to generate token with empty secret: %v", err)
	}
	claims, err := middlewares.ValidateToken(tok, "")
	if err != nil {
		t.Fatalf("Failed to validate token generated with ephemeral secret: %v", err)
	}
	if claims.Username != "admin" || claims.Role != "admin" {
		t.Errorf("Unexpected claims with ephemeral secret: %+v", claims)
	}
}

func TestAuthMiddleware(t *testing.T) {
	secret := "secret-for-middleware-tests"

	r := gin.New()
	r.Use(middlewares.AuthMiddleware(secret))
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/api/auth/login", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "public_login"})
	})
	r.GET("/api/test", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")
		role, _ := c.Get("role")
		c.JSON(http.StatusOK, gin.H{
			"user_id":  userID,
			"username": username,
			"role":     role,
		})
	})

	// 1. Health endpoint should bypass auth
	reqHealth := httptest.NewRequest(http.MethodGet, "/health", nil)
	wHealth := httptest.NewRecorder()
	r.ServeHTTP(wHealth, reqHealth)
	if wHealth.Code != http.StatusOK {
		t.Errorf("Expected 200 for /health without auth, got %d", wHealth.Code)
	}

	// 2. /api/auth/login endpoint should bypass auth
	reqLogin := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	wLogin := httptest.NewRecorder()
	r.ServeHTTP(wLogin, reqLogin)
	if wLogin.Code != http.StatusOK {
		t.Errorf("Expected 200 for /api/auth/login without auth, got %d", wLogin.Code)
	}

	// 3. Protected endpoint without header -> 401
	reqNoAuth := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	wNoAuth := httptest.NewRecorder()
	r.ServeHTTP(wNoAuth, reqNoAuth)
	if wNoAuth.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for /api/test without auth, got %d", wNoAuth.Code)
	}

	// 4. Protected endpoint with invalid Bearer token -> 401
	reqBadToken := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	reqBadToken.Header.Set("Authorization", "Bearer invalid-garbage-token")
	wBadToken := httptest.NewRecorder()
	r.ServeHTTP(wBadToken, reqBadToken)
	if wBadToken.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for invalid token, got %d", wBadToken.Code)
	}

	// 5. Protected endpoint with valid token -> 200
	validToken, _ := middlewares.GenerateToken(101, "alice", "admin", secret, 1*time.Hour)
	reqValid := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	reqValid.Header.Set("Authorization", "Bearer "+validToken)
	wValid := httptest.NewRecorder()
	r.ServeHTTP(wValid, reqValid)
	if wValid.Code != http.StatusOK {
		t.Errorf("Expected 200 for valid token, got %d", wValid.Code)
	}
}

func TestRequireRole(t *testing.T) {
	r := gin.New()

	r.GET("/operator-only", func(c *gin.Context) {
		role := c.Query("role")
		if role != "" {
			c.Set("role", role)
		}
		c.Next()
	}, middlewares.RequireRole("operator"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "granted"})
	})

	// 1. Operator role granted
	reqOp := httptest.NewRequest(http.MethodGet, "/operator-only?role=operator", nil)
	wOp := httptest.NewRecorder()
	r.ServeHTTP(wOp, reqOp)
	if wOp.Code != http.StatusOK {
		t.Errorf("Expected 200 for operator, got %d", wOp.Code)
	}

	// 2. Admin role granted (admin superuser bypass)
	reqAdmin := httptest.NewRequest(http.MethodGet, "/operator-only?role=admin", nil)
	wAdmin := httptest.NewRecorder()
	r.ServeHTTP(wAdmin, reqAdmin)
	if wAdmin.Code != http.StatusOK {
		t.Errorf("Expected 200 for admin on operator route, got %d", wAdmin.Code)
	}

	// 3. Viewer role forbidden
	reqViewer := httptest.NewRequest(http.MethodGet, "/operator-only?role=viewer", nil)
	wViewer := httptest.NewRecorder()
	r.ServeHTTP(wViewer, reqViewer)
	if wViewer.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for viewer, got %d", wViewer.Code)
	}

	// 4. No role forbidden
	reqNoRole := httptest.NewRequest(http.MethodGet, "/operator-only", nil)
	wNoRole := httptest.NewRecorder()
	r.ServeHTTP(wNoRole, reqNoRole)
	if wNoRole.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for missing role, got %d", wNoRole.Code)
	}
}
