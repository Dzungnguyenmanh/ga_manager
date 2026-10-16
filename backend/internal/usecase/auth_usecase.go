package usecase

import (
	"context"
	"errors"
	"time"

	"kong-manager-backend/internal/delivery/http/middlewares"
	"kong-manager-backend/internal/domain"

	"golang.org/x/crypto/bcrypt"
)

type authUsecase struct {
	userRepo  domain.UserRepository
	jwtSecret string
}

func NewAuthUsecase(repo domain.UserRepository, jwtSecret string) domain.AuthUsecase {
	if jwtSecret == "" {
		jwtSecret = middlewares.GetJWTSecret()
	}
	return &authUsecase{
		userRepo:  repo,
		jwtSecret: jwtSecret,
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
