package security

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

var (
	ErrBlockedHost      = errors.New("access to private or metadata hosts is restricted")
	ErrBlockedIP        = errors.New("access to internal, loopback, or link-local network addresses is prohibited")
	ErrInvalidURL       = errors.New("invalid target URL format")
	ErrMissingHost      = errors.New("missing hostname in target URL")
	ErrResolutionFailed = errors.New("failed to resolve target hostname")
)

// Blocked CIDR ranges covering loopback, link-local (cloud metadata), RFC1918, and private IPv6
var blockedCIDRStrings = []string{
	"0.0.0.0/8",          // Current network
	"10.0.0.0/8",         // RFC 1918 private IPv4
	"100.64.0.0/10",      // Carrier-grade NAT (RFC 6598)
	"127.0.0.0/8",        // IPv4 loopback
	"169.254.0.0/16",     // RFC 3927 Link-local / Cloud metadata (including 169.254.169.254)
	"172.16.0.0/12",      // RFC 1918 private IPv4
	"192.0.0.0/24",       // IETF protocol assignments
	"192.0.2.0/24",       // TEST-NET-1 (RFC 5737)
	"192.168.0.0/16",     // RFC 1918 private IPv4
	"198.18.0.0/15",      // Benchmark testing (RFC 2544)
	"198.51.100.0/24",    // TEST-NET-2 (RFC 5737)
	"203.0.113.0/24",     // TEST-NET-3 (RFC 5737)
	"224.0.0.0/4",        // Multicast
	"240.0.0.0/4",        // Reserved
	"255.255.255.255/32", // Broadcast
	"::1/128",            // IPv6 loopback
	"::/128",             // IPv6 unspecified
	"fc00::/7",           // IPv6 unique local address (ULA)
	"fe80::/10",          // IPv6 link-local
	"ff00::/8",           // IPv6 multicast
}

var blockedIPNets []*net.IPNet

func init() {
	for _, cidr := range blockedCIDRStrings {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err == nil && ipNet != nil {
			blockedIPNets = append(blockedIPNets, ipNet)
		}
	}
}

// IsBlockedIP returns true if the specified IP address is in a private, loopback, or metadata range.
func IsBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() {
		return true
	}
	for _, block := range blockedIPNets {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

// IsBlockedHostname returns true if the hostname refers to metadata endpoints, localhost, or cluster services.
func IsBlockedHostname(hostname string) bool {
	h := strings.ToLower(strings.TrimSpace(hostname))
	h = strings.Trim(h, "[]")

	if h == "localhost" || strings.HasSuffix(h, ".localhost") {
		return true
	}
	if h == "metadata.google.internal" || strings.HasSuffix(h, ".metadata.google.internal") {
		return true
	}
	if h == "metadata" || h == "instance-data" {
		return true
	}
	// Kubernetes cluster internal service patterns
	if strings.HasSuffix(h, ".svc.cluster.local") || strings.HasSuffix(h, ".cluster.local") {
		return true
	}
	return false
}

// ValidateSafeHost verifies that the given hostname or IP does not point to internal, metadata, or loopback targets.
func ValidateSafeHost(hostOrIP string) error {
	trimmed := strings.TrimSpace(hostOrIP)
	if trimmed == "" {
		return ErrMissingHost
	}

	// Split host from port if present
	host := trimmed
	if h, _, err := net.SplitHostPort(trimmed); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")

	if IsBlockedHostname(host) {
		return fmt.Errorf("%w: %s", ErrBlockedHost, host)
	}

	// Direct IP check
	if parsedIP := net.ParseIP(host); parsedIP != nil {
		if IsBlockedIP(parsedIP) {
			return fmt.Errorf("%w: %s", ErrBlockedIP, parsedIP.String())
		}
		return nil
	}

	// Hostname DNS resolution check
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("%w: %s (%v)", ErrResolutionFailed, host, err)
	}
	if len(ips) == 0 {
		return fmt.Errorf("%w: no IPs found for %s", ErrResolutionFailed, host)
	}

	for _, ip := range ips {
		if IsBlockedIP(ip) {
			return fmt.Errorf("%w: %s resolves to restricted IP %s", ErrBlockedIP, host, ip.String())
		}
	}

	return nil
}

// ValidateSafeTargetURL parses the raw URL and checks if its destination is restricted against SSRF.
func ValidateSafeTargetURL(rawURL string) error {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return ErrInvalidURL
	}

	toParse := trimmed
	if !strings.Contains(toParse, "://") {
		toParse = "http://" + toParse
	}

	parsed, err := url.Parse(toParse)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidURL, err)
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return ErrMissingHost
	}

	return ValidateSafeHost(hostname)
}
