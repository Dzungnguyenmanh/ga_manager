package domain

import "context"

type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"` // Never exposed in JSON
	Email        string `json:"email"`
	Role         string `json:"role"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type AuthUsecase interface {
	Login(ctx context.Context, username, password string) (*LoginResponse, error)
	Register(ctx context.Context, user *User, password string) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByID(ctx context.Context, id int64) (*User, error)
}
