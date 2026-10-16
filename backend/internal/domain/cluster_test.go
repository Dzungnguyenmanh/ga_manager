package domain_test

import (
	"encoding/json"
	"strings"
	"testing"

	"kong-manager-backend/internal/domain"
)

func TestClusterTokenMasking(t *testing.T) {
	cluster := domain.KongCluster{
		ID:            1,
		Name:          "Production Kong",
		URL:           "https://kong-admin.internal:8444",
		AdminToken:    "super-secret-admin-token-12345",
		HasAdminToken: true,
		Environment:   "PROD",
	}

	data, err := json.Marshal(cluster)
	if err != nil {
		t.Fatalf("Failed to marshal KongCluster: %v", err)
	}

	jsonStr := string(data)

	// AdminToken must NEVER appear in serialized JSON (VULN-01)
	if strings.Contains(jsonStr, "super-secret-admin-token-12345") {
		t.Errorf("Security Violation: cleartext admin token leaked in JSON: %s", jsonStr)
	}
	// Specifically verify that "admin_token": does not appear as a serialized key
	if strings.Contains(jsonStr, `"admin_token":`) || strings.Contains(jsonStr, `"admin_token" :`) {
		t.Errorf("Security Violation: admin_token key found in JSON: %s", jsonStr)
	}

	// HasAdminToken must be serialized
	if !strings.Contains(jsonStr, `"has_admin_token":true`) {
		t.Errorf("Expected has_admin_token:true in JSON, got: %s", jsonStr)
	}
}

func TestClusterUnmarshalToken(t *testing.T) {
	inputJSON := `{
		"name": "Staging Kong",
		"url": "https://kong-stg:8444",
		"admin_token": "stg-token-987",
		"environment": "STG"
	}`

	var cluster domain.KongCluster
	if err := json.Unmarshal([]byte(inputJSON), &cluster); err != nil {
		t.Fatalf("Failed to unmarshal KongCluster: %v", err)
	}

	if cluster.Name != "Staging Kong" {
		t.Errorf("Expected name 'Staging Kong', got '%s'", cluster.Name)
	}
	if cluster.AdminToken != "stg-token-987" {
		t.Errorf("Expected AdminToken 'stg-token-987', got '%s'", cluster.AdminToken)
	}
	if !cluster.HasAdminToken {
		t.Error("Expected HasAdminToken to be true")
	}
}
