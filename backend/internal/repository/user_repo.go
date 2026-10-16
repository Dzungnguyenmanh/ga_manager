package repository

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"

	"kong-manager-backend/internal/domain"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type userRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) domain.UserRepository {
	return &userRepository{pool: pool}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	if r.pool == nil {
		return errors.New("database pool is not initialized")
	}

	if user.Role == "" {
		user.Role = "admin"
	}

	query := `
		INSERT INTO users (username, password_hash, email, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	return r.pool.QueryRow(ctx, query, user.Username, user.PasswordHash, user.Email, user.Role).Scan(&user.ID)
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	if r.pool == nil {
		return nil, errors.New("database pool is not initialized")
	}

	query := `
		SELECT id, username, password_hash, email, COALESCE(role, 'admin')
		FROM users
		WHERE username = $1
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	if r.pool == nil {
		return nil, errors.New("database pool is not initialized")
	}

	query := `
		SELECT id, username, password_hash, email, COALESCE(role, 'admin')
		FROM users
		WHERE id = $1
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, id).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.Role)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

// InMemoryUserRepository provides a thread-safe repository for unit testing and offline environments.
type inMemoryUserRepository struct {
	mu    sync.RWMutex
	users map[string]*domain.User
	seq   int64
}

func NewInMemoryUserRepository() domain.UserRepository {
	repo := &inMemoryUserRepository{
		users: make(map[string]*domain.User),
		seq:   1,
	}

	// Seed default admin user
	defaultAdminPass := os.Getenv("INITIAL_ADMIN_PASSWORD")
	if defaultAdminPass == "" {
		defaultAdminPass = os.Getenv("ADMIN_PASSWORD")
	}
	if defaultAdminPass == "" {
		defaultAdminPass = "admin123"
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(defaultAdminPass), bcrypt.DefaultCost)
	repo.users["admin"] = &domain.User{
		ID:           1,
		Username:     "admin",
		PasswordHash: string(hash),
		Email:        "admin@kongmanager.com.vn",
		Role:         "admin",
	}

	return repo
}

func (m *inMemoryUserRepository) Create(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.users[user.Username]; exists {
		return errors.New("user already exists")
	}
	m.seq++
	user.ID = m.seq
	if user.Role == "" {
		user.Role = "admin"
	}
	m.users[user.Username] = &domain.User{
		ID:           user.ID,
		Username:     user.Username,
		PasswordHash: user.PasswordHash,
		Email:        user.Email,
		Role:         user.Role,
	}
	return nil
}

func (m *inMemoryUserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	u, exists := m.users[username]
	if !exists {
		return nil, errors.New("user not found")
	}
	return &domain.User{
		ID:           u.ID,
		Username:     u.Username,
		PasswordHash: u.PasswordHash,
		Email:        u.Email,
		Role:         u.Role,
	}, nil
}

func (m *inMemoryUserRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, u := range m.users {
		if u.ID == id {
			return &domain.User{
				ID:           u.ID,
				Username:     u.Username,
				PasswordHash: u.PasswordHash,
				Email:        u.Email,
				Role:         u.Role,
			}, nil
		}
	}
	return nil, errors.New("user not found")
}

// SeedDefaultAdminUser guarantees that at least one admin account exists in PostgreSQL.
func SeedDefaultAdminUser(ctx context.Context, repo domain.UserRepository) error {
	if repo == nil {
		return nil
	}
	_, err := repo.GetByUsername(ctx, "admin")
	if err == nil {
		// Admin user already exists
		return nil
	}

	defaultPass := os.Getenv("INITIAL_ADMIN_PASSWORD")
	if defaultPass == "" {
		defaultPass = os.Getenv("ADMIN_PASSWORD")
	}
	if defaultPass == "" {
		defaultPass = "admin123"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(defaultPass), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	admin := &domain.User{
		Username:     "admin",
		PasswordHash: string(hash),
		Email:        "admin@kongmanager.com.vn",
		Role:         "admin",
	}

	if err := repo.Create(ctx, admin); err != nil {
		return fmt.Errorf("failed to seed admin user: %w", err)
	}
	log.Println("[INFO] Successfully initialized default admin user (username: admin)")
	return nil
}
