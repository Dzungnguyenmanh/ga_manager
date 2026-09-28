package usecase

import (
	"context"
	"errors"
	"testing"

	"kong-manager-backend/internal/domain"
)

type mockClusterRepo struct {
	clusters map[int32]*domain.KongCluster
	nextID   int32
}

func (m *mockClusterRepo) Create(ctx context.Context, cluster *domain.KongCluster) error {
	cluster.ID = m.nextID
	m.nextID++
	m.clusters[cluster.ID] = cluster
	return nil
}

func (m *mockClusterRepo) GetByID(ctx context.Context, id int32) (*domain.KongCluster, error) {
	if c, ok := m.clusters[id]; ok {
		return c, nil
	}
	return nil, errors.New("not found")
}

func (m *mockClusterRepo) List(ctx context.Context) ([]domain.KongCluster, error) {
	var list []domain.KongCluster
	for _, c := range m.clusters {
		list = append(list, *c)
	}
	return list, nil
}

func (m *mockClusterRepo) Update(ctx context.Context, cluster *domain.KongCluster) error {
	m.clusters[cluster.ID] = cluster
	return nil
}

func (m *mockClusterRepo) Delete(ctx context.Context, id int32) error {
	delete(m.clusters, id)
	return nil
}

func TestClusterUsecase_Create(t *testing.T) {
	repo := &mockClusterRepo{
		clusters: make(map[int32]*domain.KongCluster),
		nextID:   1,
	}
	u := NewClusterUsecase(repo)

	t.Run("success", func(t *testing.T) {
		err := u.Create(context.Background(), &domain.KongCluster{
			Name: "Test",
			URL:  "http://test",
		})
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
	})

	t.Run("validation failed", func(t *testing.T) {
		err := u.Create(context.Background(), &domain.KongCluster{
			Name: "", // invalid
			URL:  "http://test",
		})
		if err == nil {
			t.Error("expected error for empty name")
		}
	})
}
