package router_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/router"
	"kong-manager-backend/internal/domain"
	"kong-manager-backend/internal/repository"
	"kong-manager-backend/internal/usecase"
)

func TestHealthAndPingEndpoints(t *testing.T) {
	// Setup router with nil handlers
	r := router.SetupRouter(nil, nil, nil)

	// Test /ping (public)
	reqPing, _ := http.NewRequest(http.MethodGet, "/ping", nil)
	wPing := httptest.NewRecorder()
	r.ServeHTTP(wPing, reqPing)
	if wPing.Code != http.StatusOK {
		t.Errorf("Expected status 200 for /ping, got %d", wPing.Code)
	}

	// Test /health (public)
	reqHealth, _ := http.NewRequest(http.MethodGet, "/health", nil)
	wHealth := httptest.NewRecorder()
	r.ServeHTTP(wHealth, reqHealth)
	if wHealth.Code != http.StatusOK {
		t.Errorf("Expected status 200 for /health, got %d", wHealth.Code)
	}

	// Test /api/clusters without token returns 401 Unauthorized (VULN-04)
	reqApi, _ := http.NewRequest(http.MethodGet, "/api/clusters", nil)
	wApi := httptest.NewRecorder()
	r.ServeHTTP(wApi, reqApi)
	if wApi.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for /api/clusters without token, got %d", wApi.Code)
	}
}

func TestPublicAuthLoginEndpoint(t *testing.T) {
	userRepo := repository.NewInMemoryUserRepository()
	authUsecase := usecase.NewAuthUsecase(userRepo, "test-secret-key-12345")
	authHandler := handlers.NewAuthHandler(authUsecase)

	r := router.SetupRouter(nil, nil, authHandler)

	// 1. Successful Login returns 200 with JWT token
	loginBody, _ := json.Marshal(map[string]string{
		"username": "admin",
		"password": "admin123",
	})
	reqLogin, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	r.ServeHTTP(wLogin, reqLogin)

	if wLogin.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for /api/auth/login, got %d with body: %s", wLogin.Code, wLogin.Body.String())
	}

	var resp struct {
		Token string       `json:"token"`
		User  *domain.User `json:"user"`
	}
	if err := json.Unmarshal(wLogin.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse login response: %v", err)
	}
	if resp.Token == "" {
		t.Error("Expected non-empty JWT token in login response")
	}
	if resp.User == nil || resp.User.Username != "admin" {
		t.Errorf("Expected user username 'admin', got: %+v", resp.User)
	}

	// 2. Failed Login with invalid password returns 401 Unauthorized
	badBody, _ := json.Marshal(map[string]string{
		"username": "admin",
		"password": "wrongpassword",
	})
	reqBad, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(badBody))
	reqBad.Header.Set("Content-Type", "application/json")
	wBad := httptest.NewRecorder()
	r.ServeHTTP(wBad, reqBad)

	if wBad.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 Unauthorized for bad password, got %d", wBad.Code)
	}

	// 3. Failed Login with non-existent user returns 401
	nonExistentBody, _ := json.Marshal(map[string]string{
		"username": "nonexistent",
		"password": "admin123",
	})
	reqNon, _ := http.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(nonExistentBody))
	reqNon.Header.Set("Content-Type", "application/json")
	wNon := httptest.NewRecorder()
	r.ServeHTTP(wNon, reqNon)

	if wNon.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 Unauthorized for non-existent user, got %d", wNon.Code)
	}
}
