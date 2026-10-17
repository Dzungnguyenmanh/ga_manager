package usecase_test

import (
	"context"
	"testing"

	"kong-manager-backend/internal/domain"
	"kong-manager-backend/internal/repository"
	"kong-manager-backend/internal/usecase"
)

func TestAuthUsecase_Login(t *testing.T) {
	userRepo := repository.NewInMemoryUserRepository()
	authU := usecase.NewAuthUsecase(userRepo, "test-secret-12345")

	// 1. Successful Login
	resp, err := authU.Login(context.Background(), "admin", "admin123")
	if err != nil {
		t.Fatalf("Expected login success, got error: %v", err)
	}
	if resp == nil || resp.Token == "" {
		t.Fatal("Expected valid token returned, got nil or empty")
	}
	if resp.User.Username != "admin" || resp.User.Role != "admin" {
		t.Errorf("Unexpected user: %+v", resp.User)
	}

	// 2. Invalid password
	_, err = authU.Login(context.Background(), "admin", "wrong-password")
	if err == nil {
		t.Error("Expected error for wrong password, got nil")
	}

	// 3. Non-existent user
	_, err = authU.Login(context.Background(), "unknown_user", "password")
	if err == nil {
		t.Error("Expected error for unknown user, got nil")
	}

	// 4. Register new user and authenticate
	newUser := &domain.User{
		Username: "operator_test",
		Email:    "op@kongmanager.com.vn",
		Role:     "operator",
	}
	if err := authU.Register(context.Background(), newUser, "operator_pass"); err != nil {
		t.Fatalf("Failed to register new user: %v", err)
	}

	opResp, err := authU.Login(context.Background(), "operator_test", "operator_pass")
	if err != nil {
		t.Fatalf("Failed to login registered user: %v", err)
	}
	if opResp.User.Role != "operator" {
		t.Errorf("Expected operator role, got: %s", opResp.User.Role)
	}
}

func TestAuthUsecase_SSOConfig(t *testing.T) {
	userRepo := repository.NewInMemoryUserRepository()
	authU := usecase.NewAuthUsecase(userRepo, "test-secret-12345")

	cfg := authU.GetSSOConfig()
	if cfg == nil {
		t.Fatal("Expected non-nil SSOConfig")
	}
	if cfg.TenantID != "TNSHMISP000000" {
		t.Errorf("Expected TenantID 'TNSHMISP000000', got '%s'", cfg.TenantID)
	}
	if cfg.Realm != "hmisp" {
		t.Errorf("Expected Realm 'hmisp', got '%s'", cfg.Realm)
	}
	if cfg.ClientID != "hiam-client-Id" {
		t.Errorf("Expected ClientID 'hiam-client-Id', got '%s'", cfg.ClientID)
	}
	if cfg.SSOURL != "https://sso.hmisp.com.vn" {
		t.Errorf("Expected SSOURL 'https://sso.hmisp.com.vn', got '%s'", cfg.SSOURL)
	}
}

