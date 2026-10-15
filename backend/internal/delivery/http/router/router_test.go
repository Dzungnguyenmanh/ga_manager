package router_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"kong-manager-backend/internal/delivery/http/router"
)

func TestHealthAndPingEndpoints(t *testing.T) {
	// Setup router with nil handlers since /ping and /health don't use them
	r := router.SetupRouter(nil, nil)

	// Test /ping
	reqPing, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	wPing := httptest.NewRecorder()
	r.ServeHTTP(wPing, reqPing)
	if wPing.Code != http.StatusOK {
		t.Errorf("Expected status 200 for /ping, got %d", wPing.Code)
	}

	// Test /health
	reqHealth, _ := http.NewRequest(http.MethodGet, "/health", nil)
	wHealth := httptest.NewRecorder()
	r.ServeHTTP(wHealth, reqHealth)
	if wHealth.Code != http.StatusOK {
		t.Errorf("Expected status 200 for /health, got %d", wHealth.Code)
	}
}
