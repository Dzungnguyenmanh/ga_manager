package usecase

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"time"

	"kong-manager-backend/internal/delivery/http/middlewares"
	"kong-manager-backend/internal/domain"

	"golang.org/x/crypto/bcrypt"
)

const (
	DefaultSSOURL      = "https://sso.hmisp.com.vn"
	DefaultSSOTenantID = "TNSHMISP000000"
	DefaultSSORealm    = "hmisp"
	DefaultSSOClientID = "hiam-client-Id"
)

type authUsecase struct {
	userRepo   domain.UserRepository
	jwtSecret  string
	httpClient *http.Client
}

func NewAuthUsecase(repo domain.UserRepository, jwtSecret string) domain.AuthUsecase {
	if jwtSecret == "" {
		jwtSecret = middlewares.GetJWTSecret()
	}

	skipTLS := strings.EqualFold(os.Getenv("SSO_TLS_SKIP_VERIFY"), "true") ||
		strings.EqualFold(os.Getenv("KONG_TLS_SKIP_VERIFY"), "true")

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: skipTLS, //nolint:gosec
		},
	}

	return &authUsecase{
		userRepo:  repo,
		jwtSecret: jwtSecret,
		httpClient: &http.Client{
			Timeout:   15 * time.Second,
			Transport: transport,
		},
	}
}

func (u *authUsecase) GetSSOConfig() *domain.SSOConfig {
	ssoURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SSO_URL")), "/")
	if ssoURL == "" {
		ssoURL = strings.TrimRight(strings.TrimSpace(os.Getenv("NEXT_PUBLIC_SSO_URL")), "/")
	}
	if ssoURL == "" {
		ssoURL = DefaultSSOURL
	}

	tenantID := strings.TrimSpace(os.Getenv("SSO_TENANT_ID"))
	if tenantID == "" {
		tenantID = DefaultSSOTenantID
	}

	realm := strings.TrimSpace(os.Getenv("SSO_REALM"))
	if realm == "" {
		realm = DefaultSSORealm
	}

	clientID := strings.TrimSpace(os.Getenv("SSO_CLIENT_ID"))
	if clientID == "" {
		clientID = DefaultSSOClientID
	}

	return &domain.SSOConfig{
		SSOURL:            ssoURL,
		TenantID:          tenantID,
		Realm:             realm,
		ClientID:          clientID,
		AuthorizeEndpoint: fmt.Sprintf("%s/api/v1/oauth2/authorize", ssoURL),
		TokenEndpoint:     fmt.Sprintf("%s/api/v1/auth/token", ssoURL),
		UserInfoEndpoint:  fmt.Sprintf("%s/api/v1/auth/userinfo", ssoURL),
	}
}

func (u *authUsecase) Login(ctx context.Context, username, password string) (*domain.LoginResponse, error) {
	if username == "" || password == "" {
		return nil, errors.New("username and password are required")
	}

	user, err := u.userRepo.GetByUsername(ctx, username)
	if err != nil || user == nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password hash using bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Issue genuine cryptographically signed HMAC-SHA256 JWT token
	role := user.Role
	if role == "" {
		role = "admin"
	}

	token, err := middlewares.GenerateToken(user.ID, user.Username, role, u.jwtSecret, 24*time.Hour)
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	return &domain.LoginResponse{
		Token: token,
		User: &domain.User{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     role,
		},
	}, nil
}

func (u *authUsecase) Register(ctx context.Context, user *domain.User, password string) error {
	if user == nil || user.Username == "" || password == "" {
		return errors.New("invalid user registration parameters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return u.userRepo.Create(ctx, user)
}

type hiamTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	Error        string `json:"error"`
	Message      string `json:"message"`
}

type hiamUserInfoResponse struct {
	Sub               string   `json:"sub"`
	UserID            string   `json:"user_id"`
	Username          string   `json:"username"`
	PreferredUsername string   `json:"preferred_username"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	TenantID          string   `json:"tenant_id"`
	Roles             []string `json:"roles"`
	Role              string   `json:"role"`
}

// ExchangeSSOCode exchanges an OAuth2 authorization code (or validates an H-IAM access_token)
// with sso.hmisp.com.vn and issues a Gateway Manager session token.
func (u *authUsecase) ExchangeSSOCode(ctx context.Context, req *domain.SSOCallbackRequest) (*domain.SSOLoginResponse, error) {
	if req == nil {
		return nil, errors.New("missing SSO callback parameters")
	}

	cfg := u.GetSSOConfig()
	clientID := strings.TrimSpace(req.ClientID)
	if clientID == "" {
		clientID = cfg.ClientID
	}
	tenantID := strings.TrimSpace(req.TenantID)
	if tenantID == "" {
		tenantID = cfg.TenantID
	}
	realm := strings.TrimSpace(req.Realm)
	if realm == "" {
		realm = cfg.Realm
	}
	clientSecret := strings.TrimSpace(req.ClientSecret)
	if clientSecret == "" {
		clientSecret = strings.TrimSpace(os.Getenv("SSO_CLIENT_SECRET"))
	}

	accessToken := strings.TrimSpace(req.AccessToken)
	refreshToken := ""
	idToken := ""

	if strings.TrimSpace(req.Code) != "" {
		payload := map[string]string{
			"grant_type":   "authorization_code",
			"client_id":    clientID,
			"code":         strings.TrimSpace(req.Code),
			"redirect_uri": strings.TrimSpace(req.RedirectURI),
		}
		if clientSecret != "" {
			payload["client_secret"] = clientSecret
		}
		if strings.TrimSpace(req.CodeVerifier) != "" {
			payload["code_verifier"] = strings.TrimSpace(req.CodeVerifier)
		}

		bodyBytes, _ := json.Marshal(payload)
		httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.TokenEndpoint, bytes.NewReader(bodyBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to build SSO token request: %w", err)
		}
		httpReq.Header.Set("Content-Type", "application/json")

		httpResp, err := u.httpClient.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to SSO server (%s): %w", cfg.SSOURL, err)
		}
		defer httpResp.Body.Close()

		respBody, _ := io.ReadAll(httpResp.Body)
		var tokenResp hiamTokenResponse
		_ = json.Unmarshal(respBody, &tokenResp)

		if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 || tokenResp.AccessToken == "" {
			errMsg := tokenResp.Error
			if tokenResp.Message != "" {
				errMsg = tokenResp.Message
			}
			if errMsg == "" {
				errMsg = fmt.Sprintf("SSO token exchange failed with status %d", httpResp.StatusCode)
			}
			return nil, errors.New(errMsg)
		}

		accessToken = tokenResp.AccessToken
		refreshToken = tokenResp.RefreshToken
		idToken = tokenResp.IDToken
	}

	if accessToken == "" {
		return nil, errors.New("authorization code or SSO access token is required")
	}

	// Fetch user profile from /api/v1/auth/userinfo or decode claims from token
	userInfo, err := u.fetchOrDecodeSSOUser(ctx, cfg.UserInfoEndpoint, accessToken, idToken)
	if err != nil {
		return nil, err
	}

	return u.issueGatewaySessionForSSOUser(ctx, userInfo, tenantID, realm, clientID, accessToken, refreshToken)
}

// LoginWithSSO authenticates a user directly against H-IAM (sso.hmisp.com.vn) for the configured
// tenant_id (TNSHMISP000000), Realm (hmisp), and client-id (hiam-client-Id), supporting MFA if enabled.
func (u *authUsecase) LoginWithSSO(ctx context.Context, req *domain.SSODirectLoginRequest) (*domain.SSOLoginResponse, error) {
	if req == nil {
		return nil, errors.New("missing SSO login request")
	}

	cfg := u.GetSSOConfig()
	tenantID := strings.TrimSpace(req.TenantID)
	if tenantID == "" {
		tenantID = cfg.TenantID
	}
	realm := strings.TrimSpace(req.Realm)
	if realm == "" {
		realm = cfg.Realm
	}
	clientID := strings.TrimSpace(req.ClientID)
	if clientID == "" {
		clientID = cfg.ClientID
	}

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Timeout:   u.httpClient.Timeout,
		Transport: u.httpClient.Transport,
		Jar:       jar,
	}

	// Step 0: Obtain CSRF token from H-IAM
	csrfToken := ""
	csrfReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/api/v1/auth/csrf-token", cfg.SSOURL), nil)
	if err == nil {
		if csrfResp, err := client.Do(csrfReq); err == nil {
			defer csrfResp.Body.Close()
			var csrfData struct {
				CSRFToken string `json:"csrf_token"`
			}
			_ = json.NewDecoder(csrfResp.Body).Decode(&csrfData)
			csrfToken = csrfData.CSRFToken
		}
	}

	// Step 1: Check if this is an MFA TOTP verification step
	if strings.TrimSpace(req.MFAToken) != "" && strings.TrimSpace(req.MFACode) != "" {
		mfaURL := fmt.Sprintf("%s/api/v1/tenants/%s/auth/mfa/totp/verify", cfg.SSOURL, tenantID)
		mfaPayload, _ := json.Marshal(map[string]string{
			"mfa_token": strings.TrimSpace(req.MFAToken),
			"code":      strings.TrimSpace(req.MFACode),
		})
		mfaHttpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, mfaURL, bytes.NewReader(mfaPayload))
		if err != nil {
			return nil, err
		}
		mfaHttpReq.Header.Set("Content-Type", "application/json")
		if csrfToken != "" {
			mfaHttpReq.Header.Set("X-CSRF-Token", csrfToken)
		}

		mfaResp, err := client.Do(mfaHttpReq)
		if err != nil {
			return nil, fmt.Errorf("failed to verify MFA with SSO server: %w", err)
		}
		defer mfaResp.Body.Close()

		bodyBytes, _ := io.ReadAll(mfaResp.Body)
		var loginData struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			SessionID    string `json:"session_id"`
			Error        string `json:"error"`
			Message      string `json:"message"`
			User         *struct {
				ID       string   `json:"id"`
				Username string   `json:"username"`
				Email    string   `json:"email"`
				Roles    []string `json:"roles"`
				TenantID string   `json:"tenant_id"`
			} `json:"user"`
		}
		_ = json.Unmarshal(bodyBytes, &loginData)

		if mfaResp.StatusCode < 200 || mfaResp.StatusCode >= 300 {
			msg := loginData.Message
			if msg == "" {
				msg = loginData.Error
			}
			if msg == "" {
				msg = "invalid MFA verification code"
			}
			return nil, errors.New(msg)
		}

		var uInfo *hiamUserInfoResponse
		if loginData.User != nil {
			uInfo = &hiamUserInfoResponse{
				Sub:      loginData.User.ID,
				Username: loginData.User.Username,
				Email:    loginData.User.Email,
				Roles:    loginData.User.Roles,
				TenantID: loginData.User.TenantID,
			}
		} else if loginData.AccessToken != "" {
			uInfo, err = u.fetchOrDecodeSSOUser(ctx, cfg.UserInfoEndpoint, loginData.AccessToken, "")
			if err != nil {
				return nil, err
			}
		}
		if uInfo == nil {
			return nil, errors.New("failed to resolve user profile after MFA verification")
		}
		return u.issueGatewaySessionForSSOUser(ctx, uInfo, tenantID, realm, clientID, loginData.AccessToken, loginData.RefreshToken)
	}

	// Step 2: Direct credentials login with H-IAM
	username := strings.TrimSpace(req.Username)
	password := req.Password
	if username == "" || password == "" {
		return nil, errors.New("username and password are required")
	}

	loginURL := fmt.Sprintf("%s/api/v1/tenants/%s/auth/login", cfg.SSOURL, tenantID)
	loginPayload := map[string]string{
		"tenant_id": tenantID,
		"client_id": clientID,
		"realm":     realm,
		"username":  username,
		"password":  password,
	}
	if strings.TrimSpace(req.ClientSecret) != "" {
		loginPayload["client_secret"] = strings.TrimSpace(req.ClientSecret)
	}

	loginBytes, _ := json.Marshal(loginPayload)
	loginHttpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, loginURL, bytes.NewReader(loginBytes))
	if err != nil {
		return nil, err
	}
	loginHttpReq.Header.Set("Content-Type", "application/json")
	if csrfToken != "" {
		loginHttpReq.Header.Set("X-CSRF-Token", csrfToken)
	}

	loginResp, err := client.Do(loginHttpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to SSO server (%s): %w", cfg.SSOURL, err)
	}
	defer loginResp.Body.Close()

	respBytes, _ := io.ReadAll(loginResp.Body)
	var directData struct {
		RequiresMFA  bool   `json:"requires_mfa"`
		MFAToken     string `json:"mfa_token"`
		SessionID    string `json:"session_id"`
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		Error        string `json:"error"`
		Message      string `json:"message"`
		User         *struct {
			ID       string   `json:"id"`
			Username string   `json:"username"`
			Email    string   `json:"email"`
			Roles    []string `json:"roles"`
			TenantID string   `json:"tenant_id"`
		} `json:"user"`
	}
	_ = json.Unmarshal(respBytes, &directData)

	if loginResp.StatusCode < 200 || loginResp.StatusCode >= 300 {
		msg := directData.Message
		if msg == "" {
			msg = directData.Error
		}
		if msg == "" {
			msg = "invalid SSO credentials"
		}
		return nil, errors.New(msg)
	}

	if directData.RequiresMFA {
		return &domain.SSOLoginResponse{
			RequiresMFA: true,
			MFAToken:    directData.MFAToken,
			TenantID:    tenantID,
			Realm:       realm,
			ClientID:    clientID,
		}, nil
	}

	// If login succeeded and returned a session_id, we can also obtain an OAuth2 authorization_code
	// for client_id = hiam-client-Id or use the returned user profile directly!
	accessToken := directData.AccessToken
	refreshToken := directData.RefreshToken

	if accessToken == "" {
		// Request RS256 token pair from H-IAM token endpoint
		tokenURL := fmt.Sprintf("%s/api/v1/tenants/%s/auth/token", cfg.SSOURL, tenantID)
		tokenBody, _ := json.Marshal(map[string]string{
			"grant_type": "password",
			"tenant_id":  tenantID,
			"username":   username,
			"password":   password,
			"scope":      "openid profile email",
		})
		if tokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, bytes.NewReader(tokenBody)); err == nil {
			tokenReq.Header.Set("Content-Type", "application/json")
			if tokenRes, err := client.Do(tokenReq); err == nil {
				defer tokenRes.Body.Close()
				var tr hiamTokenResponse
				if err := json.NewDecoder(tokenRes.Body).Decode(&tr); err == nil && tr.AccessToken != "" {
					accessToken = tr.AccessToken
					refreshToken = tr.RefreshToken
				}
			}
		}
	}

	var uInfo *hiamUserInfoResponse
	if directData.User != nil && directData.User.Username != "" {
		uInfo = &hiamUserInfoResponse{
			Sub:      directData.User.ID,
			Username: directData.User.Username,
			Email:    directData.User.Email,
			Roles:    directData.User.Roles,
			TenantID: directData.User.TenantID,
		}
	} else if accessToken != "" {
		uInfo, err = u.fetchOrDecodeSSOUser(ctx, cfg.UserInfoEndpoint, accessToken, "")
		if err != nil {
			return nil, err
		}
	}

	if uInfo == nil {
		return nil, errors.New("SSO login succeeded but user profile could not be retrieved")
	}

	return u.issueGatewaySessionForSSOUser(ctx, uInfo, tenantID, realm, clientID, accessToken, refreshToken)
}

func (u *authUsecase) fetchOrDecodeSSOUser(ctx context.Context, userInfoEndpoint, accessToken, idToken string) (*hiamUserInfoResponse, error) {
	// 1. Try GET /api/v1/auth/userinfo with Bearer access_token
	if userInfoEndpoint != "" && accessToken != "" {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoEndpoint, nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+accessToken)
			if resp, err := u.httpClient.Do(req); err == nil {
				defer resp.Body.Close()
				if resp.StatusCode >= 200 && resp.StatusCode < 300 {
					var info hiamUserInfoResponse
					if err := json.NewDecoder(resp.Body).Decode(&info); err == nil {
						if info.Username == "" {
							info.Username = info.PreferredUsername
						}
						if info.Username == "" {
							info.Username = info.Name
						}
						if info.Username != "" {
							return &info, nil
						}
					}
				}
			}
		}
	}

	// 2. Fallback: Decode JWT payload from idToken or accessToken
	for _, tok := range []string{idToken, accessToken} {
		if tok == "" {
			continue
		}
		parts := strings.Split(tok, ".")
		if len(parts) != 3 {
			continue
		}
		payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			payloadBytes, err = base64.URLEncoding.DecodeString(parts[1])
			if err != nil {
				continue
			}
		}
		var info hiamUserInfoResponse
		if err := json.Unmarshal(payloadBytes, &info); err == nil {
			if info.Username == "" {
				info.Username = info.PreferredUsername
			}
			if info.Username == "" {
				info.Username = info.Name
			}
			if info.Username != "" {
				return &info, nil
			}
		}
	}

	return nil, errors.New("unable to retrieve user profile from SSO token")
}

func (u *authUsecase) issueGatewaySessionForSSOUser(
	ctx context.Context,
	ssoUser *hiamUserInfoResponse,
	tenantID, realm, clientID, ssoAccessToken, ssoRefreshToken string,
) (*domain.SSOLoginResponse, error) {
	username := strings.TrimSpace(ssoUser.Username)
	if username == "" {
		username = strings.TrimSpace(ssoUser.PreferredUsername)
	}
	if username == "" {
		return nil, errors.New("SSO user profile is missing username")
	}

	email := strings.TrimSpace(ssoUser.Email)
	if email == "" {
		email = fmt.Sprintf("%s@hmisp.com.vn", username)
	}

	role := mapSSORole(ssoUser.Roles, ssoUser.Role)

	// Upsert or fetch user in local repository
	var localUser *domain.User
	if u.userRepo != nil {
		existing, err := u.userRepo.GetByUsername(ctx, username)
		if err == nil && existing != nil {
			localUser = existing
			if localUser.Role == "" {
				localUser.Role = role
			}
		} else {
			randomHash, _ := bcrypt.GenerateFromPassword([]byte(fmt.Sprintf("sso-%s-%d", username, time.Now().UnixNano())), bcrypt.DefaultCost)
			newUser := &domain.User{
				Username:     username,
				PasswordHash: string(randomHash),
				Email:        email,
				Role:         role,
			}
			if createErr := u.userRepo.Create(ctx, newUser); createErr == nil {
				localUser = newUser
			}
		}
	}

	if localUser == nil {
		localUser = &domain.User{
			ID:       1,
			Username: username,
			Email:    email,
			Role:     role,
		}
	}

	localUser.SSOProvider = "sso.hmisp.com.vn"
	localUser.TenantID = tenantID
	localUser.Realm = realm

	jwtToken, err := middlewares.GenerateToken(localUser.ID, localUser.Username, localUser.Role, u.jwtSecret, 24*time.Hour)
	if err != nil {
		return nil, errors.New("failed to generate Gateway Manager session token")
	}

	return &domain.SSOLoginResponse{
		Token:           jwtToken,
		SSOAccessToken:  ssoAccessToken,
		SSORefreshToken: ssoRefreshToken,
		User:            localUser,
		TenantID:        tenantID,
		Realm:           realm,
		ClientID:        clientID,
	}, nil
}

func mapSSORole(roles []string, singleRole string) string {
	allRoles := append([]string{}, roles...)
	if singleRole != "" {
		allRoles = append(allRoles, singleRole)
	}

	for _, r := range allRoles {
		lower := strings.ToLower(strings.TrimSpace(r))
		if lower == "admin" || lower == "super_admin" || lower == "realm_admin" || lower == "system_admin" {
			return "admin"
		}
	}
	for _, r := range allRoles {
		lower := strings.ToLower(strings.TrimSpace(r))
		if lower == "operator" || lower == "manager" || lower == "developer" {
			return "operator"
		}
	}
	for _, r := range allRoles {
		lower := strings.ToLower(strings.TrimSpace(r))
		if lower == "viewer" || lower == "readonly" {
			return "viewer"
		}
	}

	defaultRole := strings.TrimSpace(os.Getenv("SSO_DEFAULT_ROLE"))
	if defaultRole != "" {
		return defaultRole
	}
	return "admin"
}

