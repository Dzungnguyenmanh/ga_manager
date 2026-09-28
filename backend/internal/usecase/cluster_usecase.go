package usecase

import (
	"context"
	"errors"

	"kong-manager-backend/internal/domain"
)

type clusterUsecase struct {
	repo domain.ClusterRepository
}

func NewClusterUsecase(repo domain.ClusterRepository) domain.ClusterUsecase {
	return &clusterUsecase{
		repo: repo,
	}
}

func (u *clusterUsecase) Create(ctx context.Context, cluster *domain.KongCluster) error {
	if cluster.Name == "" || cluster.URL == "" {
		return errors.New("name and url are required")
	}
	return u.repo.Create(ctx, cluster)
}

func (u *clusterUsecase) GetByID(ctx context.Context, id int32) (*domain.KongCluster, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *clusterUsecase) List(ctx context.Context) ([]domain.KongCluster, error) {
	return u.repo.List(ctx)
}

func (u *clusterUsecase) Update(ctx context.Context, cluster *domain.KongCluster) error {
	if cluster.ID == 0 {
		return errors.New("id is required")
	}
	return u.repo.Update(ctx, cluster)
}

func (u *clusterUsecase) Delete(ctx context.Context, id int32) error {
	return u.repo.Delete(ctx, id)
}
