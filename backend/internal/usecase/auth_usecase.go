package usecase

import (
	"context"
	"errors"

	"kong-manager-backend/internal/domain"
)

type authUsecase struct {
	userRepo domain.UserRepository
}

func NewAuthUsecase(repo domain.UserRepository) domain.AuthUsecase {
	return &authUsecase{userRepo: repo}
}

func (u *authUsecase) Login(ctx context.Context, username, password string) (string, error) {
	user, err := u.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// Basic string compare for MVP (in production use bcrypt)
	if user.Password != password {
		return "", errors.New("invalid credentials")
	}

	// In real world, return a JWT token. Returning dummy token here.
	return "mock-jwt-token-123", nil
}

func (u *authUsecase) Register(ctx context.Context, user *domain.User) error {
	return u.userRepo.Create(ctx, user)
}
