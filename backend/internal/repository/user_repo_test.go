package repository_test

import (
	"context"
	"os"
	"testing"

	"kong-manager-backend/internal/domain"
	"kong-manager-backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

func TestSeedDefaultAdminUser_SuccessAndSync(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()

	// 1. Initial seed with default password admin123
	err := repository.SeedDefaultAdminUser(context.Background(), repo)
	if err != nil {
		t.Fatalf("Failed to seed default admin: %v", err)
	}

	user, err := repo.GetByUsername(context.Background(), "admin")
	if err != nil {
		t.Fatalf("Admin user not found: %v", err)
	}
	if user.Role != "admin" {
		t.Errorf("Expected role 'admin', got '%s'", user.Role)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("admin123")); err != nil {
		t.Errorf("Password hash does not match default 'admin123': %v", err)
	}

	// 2. Simulate outdated/corrupted password hash and re-seeding with updated env password
	os.Setenv("INITIAL_ADMIN_PASSWORD", "new_secure_admin_pass")
	defer os.Unsetenv("INITIAL_ADMIN_PASSWORD")

	// Set an outdated hash on existing user
	oldHash, _ := bcrypt.GenerateFromPassword([]byte("outdated_password"), bcrypt.DefaultCost)
	_ = repo.UpdatePassword(context.Background(), "admin", string(oldHash))

	// Re-run seed - it should detect mismatch and synchronize password hash
	err = repository.SeedDefaultAdminUser(context.Background(), repo)
	if err != nil {
		t.Fatalf("Failed to re-seed and synchronize admin: %v", err)
	}

	updatedUser, err := repo.GetByUsername(context.Background(), "admin")
	if err != nil {
		t.Fatalf("Admin user not found after sync: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(updatedUser.PasswordHash), []byte("new_secure_admin_pass")); err != nil {
		t.Errorf("Password hash was not synchronized to new_secure_admin_pass: %v", err)
	}
}

func TestInMemoryUserRepository_UpdatePassword(t *testing.T) {
	repo := repository.NewInMemoryUserRepository()
	ctx := context.Background()

	err := repo.UpdatePassword(ctx, "nonexistent", "hash")
	if err == nil {
		t.Error("Expected error for nonexistent user, got nil")
	}

	user := &domain.User{
		Username:     "testuser",
		PasswordHash: "initial-hash",
		Email:        "test@example.com",
		Role:         "viewer",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if err := repo.UpdatePassword(ctx, "testuser", "updated-hash"); err != nil {
		t.Fatalf("Failed to update password: %v", err)
	}

	fetched, err := repo.GetByUsername(ctx, "testuser")
	if err != nil {
		t.Fatalf("Failed to get updated user: %v", err)
	}
	if fetched.PasswordHash != "updated-hash" {
		t.Errorf("Expected 'updated-hash', got '%s'", fetched.PasswordHash)
	}
}
