package domain

import "context"

type User struct {
	ID       int32
	Username string
	Password string // In real world this should be unexported or handled carefully
	Email    string
}

type AuthUsecase interface {
	Login(ctx context.Context, username, password string) (string, error)
	Register(ctx context.Context, user *User) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByUsername(ctx context.Context, username string) (*User, error)
}
