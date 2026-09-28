package domain

import "context"

type KongCluster struct {
	ID         int32  `json:"id"`
	Name       string `json:"name"`
	URL        string `json:"url"`
	AdminToken string `json:"admin_token,omitempty"`
}

type ClusterUsecase interface {
	Create(ctx context.Context, cluster *KongCluster) error
	GetByID(ctx context.Context, id int32) (*KongCluster, error)
	List(ctx context.Context) ([]KongCluster, error)
	Update(ctx context.Context, cluster *KongCluster) error
	Delete(ctx context.Context, id int32) error
}

type ClusterRepository interface {
	Create(ctx context.Context, cluster *KongCluster) error
	GetByID(ctx context.Context, id int32) (*KongCluster, error)
	List(ctx context.Context) ([]KongCluster, error)
	Update(ctx context.Context, cluster *KongCluster) error
	Delete(ctx context.Context, id int32) error
}
