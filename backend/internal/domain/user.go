package domain

import "context"

type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"` // Never exposed in JSON
	Email        string `json:"email"`
	Role         string `json:"role"`
	SSOProvider  string `json:"sso_provider,omitempty"`
	TenantID     string `json:"tenant_id,omitempty"`
	Realm        string `json:"realm,omitempty"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type SSOConfig struct {
	SSOURL            string `json:"sso_url"`
	TenantID          string `json:"tenant_id"`
	Realm             string `json:"realm"`
	ClientID          string `json:"client_id"`
	AuthorizeEndpoint string `json:"authorize_endpoint"`
	TokenEndpoint     string `json:"token_endpoint"`
	UserInfoEndpoint  string `json:"userinfo_endpoint"`
}

type SSOCallbackRequest struct {
	Code         string `json:"code"`
	RedirectURI  string `json:"redirect_uri"`
	State        string `json:"state"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	TenantID     string `json:"tenant_id"`
	Realm        string `json:"realm"`
	CodeVerifier string `json:"code_verifier"`
	AccessToken  string `json:"access_token"`
}

type SSODirectLoginRequest struct {
	Username     string `json:"username"`
	Password     string `json:"password"`
	TenantID     string `json:"tenant_id"`
	Realm        string `json:"realm"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	MFAToken     string `json:"mfa_token"`
	MFACode      string `json:"mfa_code"`
}

type SSOLoginResponse struct {
	Token           string `json:"token,omitempty"`
	SSOAccessToken  string `json:"sso_access_token,omitempty"`
	SSORefreshToken string `json:"sso_refresh_token,omitempty"`
	User            *User  `json:"user,omitempty"`
	RequiresMFA     bool   `json:"requires_mfa,omitempty"`
	MFAToken        string `json:"mfa_token,omitempty"`
	TenantID        string `json:"tenant_id"`
	Realm           string `json:"realm"`
	ClientID        string `json:"client_id"`
}

type AuthUsecase interface {
	Login(ctx context.Context, username, password string) (*LoginResponse, error)
	Register(ctx context.Context, user *User, password string) error
	GetSSOConfig() *SSOConfig
	ExchangeSSOCode(ctx context.Context, req *SSOCallbackRequest) (*SSOLoginResponse, error)
	LoginWithSSO(ctx context.Context, req *SSODirectLoginRequest) (*SSOLoginResponse, error)
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
	UpdatePassword(ctx context.Context, username, newPasswordHash string) error
}

