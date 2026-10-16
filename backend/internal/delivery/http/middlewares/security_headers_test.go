package middlewares_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"kong-manager-backend/internal/delivery/http/middlewares"

	"github.com/gin-gonic/gin"
)

func TestSecurityHeadersMiddleware(t *testing.T) {
	os.Setenv("CORS_ALLOWED_ORIGIN", "https://kong.hmisp.com.vn")
	defer os.Unsetenv("CORS_ALLOWED_ORIGIN")

	r := gin.New()
	r.Use(middlewares.SecurityHeadersMiddleware())
	r.GET("/api/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// 1. GET request checks
	req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
	req.Header.Set("Origin", "https://kong.hmisp.com.vn")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	headers := w.Header()

	// Verify Security Headers (VULN-09)
	if got := headers.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("X-Content-Type-Options = %s, expected nosniff", got)
	}
	if got := headers.Get("X-Frame-Options"); got != "DENY" {
		t.Errorf("X-Frame-Options = %s, expected DENY", got)
	}
	if got := headers.Get("X-XSS-Protection"); got != "1; mode=block" {
		t.Errorf("X-XSS-Protection = %s, expected 1; mode=block", got)
	}
	if got := headers.Get("Referrer-Policy"); got != "strict-origin-when-cross-origin" {
		t.Errorf("Referrer-Policy = %s, expected strict-origin-when-cross-origin", got)
	}
	if got := headers.Get("Strict-Transport-Security"); got != "max-age=31536000; includeSubDomains" {
		t.Errorf("Strict-Transport-Security = %s, expected max-age=31536000; includeSubDomains", got)
	}

	// Verify CORS (VULN-08)
	if got := headers.Get("Access-Control-Allow-Origin"); got != "https://kong.hmisp.com.vn" {
		t.Errorf("Access-Control-Allow-Origin = %s, expected https://kong.hmisp.com.vn", got)
	}

	// 2. Preflight OPTIONS request
	optReq := httptest.NewRequest(http.MethodOptions, "/api/ping", nil)
	optReq.Header.Set("Origin", "https://kong.hmisp.com.vn")
	optW := httptest.NewRecorder()
	r.ServeHTTP(optW, optReq)

	if optW.Code != http.StatusNoContent {
		t.Errorf("Expected 204 for OPTIONS preflight, got %d", optW.Code)
	}
}
