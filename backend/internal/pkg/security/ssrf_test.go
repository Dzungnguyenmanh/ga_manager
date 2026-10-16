package security_test

import (
	"net"
	"testing"

	"kong-manager-backend/internal/pkg/security"
)

func TestIsBlockedIP(t *testing.T) {
	tests := []struct {
		ip       string
		expected bool
	}{
		{"127.0.0.1", true},
		{"127.0.1.1", true},
		{"::1", true},
		{"10.0.0.1", true},
		{"10.255.255.255", true},
		{"172.16.0.1", true},
		{"172.31.255.255", true},
		{"192.168.1.1", true},
		{"169.254.169.254", true}, // AWS / GCP metadata
		{"169.254.1.1", true},     // Link-local
		{"fc00::1", true},         // IPv6 ULA
		{"fe80::1", true},         // IPv6 Link-local
		{"0.0.0.0", true},
		{"8.8.8.8", false},        // Public Google DNS
		{"1.1.1.1", false},        // Public Cloudflare DNS
		{"93.184.216.34", false},  // example.com
	}

	for _, tt := range tests {
		ip := net.ParseIP(tt.ip)
		if ip == nil {
			t.Fatalf("Failed to parse IP: %s", tt.ip)
		}
		got := security.IsBlockedIP(ip)
		if got != tt.expected {
			t.Errorf("IsBlockedIP(%s) = %v, expected %v", tt.ip, got, tt.expected)
		}
	}
}

func TestIsBlockedHostname(t *testing.T) {
	tests := []struct {
		host     string
		expected bool
	}{
		{"localhost", true},
		{"sub.localhost", true},
		{"metadata.google.internal", true},
		{"test.metadata.google.internal", true},
		{"metadata", true},
		{"instance-data", true},
		{"kong-manager-postgres.svc.cluster.local", true},
		{"redis.default.svc.cluster.local", true},
		{"api.konghq.com", false},
		{"example.com", false},
		{"gateway.company.com", false},
	}

	for _, tt := range tests {
		got := security.IsBlockedHostname(tt.host)
		if got != tt.expected {
			t.Errorf("IsBlockedHostname(%s) = %v, expected %v", tt.host, got, tt.expected)
		}
	}
}

func TestValidateSafeHost(t *testing.T) {
	// Blocked hosts/IPs
	blocked := []string{
		"127.0.0.1",
		"127.0.0.1:8000",
		"[::1]:8443",
		"169.254.169.254",
		"169.254.169.254:80",
		"10.0.0.1:5432",
		"172.16.10.2:6379",
		"192.168.1.100",
		"localhost",
		"localhost:8001",
		"metadata.google.internal",
	}

	for _, h := range blocked {
		err := security.ValidateSafeHost(h)
		if err == nil {
			t.Errorf("ValidateSafeHost(%s) expected error, got nil", h)
		}
	}

	// Safe public IP
	safeIP := "8.8.8.8"
	if err := security.ValidateSafeHost(safeIP); err != nil {
		t.Errorf("ValidateSafeHost(%s) expected nil, got %v", safeIP, err)
	}

	// Missing host
	if err := security.ValidateSafeHost(""); err == nil {
		t.Error("ValidateSafeHost(\"\") expected error for empty host")
	}
}

func TestValidateSafeTargetURL(t *testing.T) {
	blockedURLs := []string{
		"http://127.0.0.1:8001/services",
		"http://localhost:8001/routes",
		"http://169.254.169.254/latest/meta-data/",
		"https://10.105.55.165:5432/",
		"http://172.16.0.5:8000/api",
		"http://192.168.1.1:8080/admin",
		"http://metadata.google.internal/computeMetadata/v1/",
		"http://[::1]:8080/test",
	}

	for _, u := range blockedURLs {
		err := security.ValidateSafeTargetURL(u)
		if err == nil {
			t.Errorf("ValidateSafeTargetURL(%s) expected error, got nil", u)
		}
	}

	// Valid public target
	safeURL := "https://8.8.8.8:443/dns-query"
	if err := security.ValidateSafeTargetURL(safeURL); err != nil {
		t.Errorf("ValidateSafeTargetURL(%s) expected nil, got %v", safeURL, err)
	}

	// Invalid URL
	if err := security.ValidateSafeTargetURL(""); err == nil {
		t.Error("ValidateSafeTargetURL(\"\") expected error for empty URL")
	}
}
