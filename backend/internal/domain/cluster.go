package domain

import (
	"context"
	"encoding/json"
)

type KongCluster struct {
	ID            int32  `json:"id"`
	Name          string `json:"name"`
	URL           string `json:"url"`
	AdminToken    string `json:"-"`
	HasAdminToken bool   `json:"has_admin_token"`
	Environment   string `json:"environment,omitempty"` // DEV, STG, PROD
}

func (c *KongCluster) UnmarshalJSON(data []byte) error {
	type Alias KongCluster
	aux := &struct {
		AdminToken string `json:"admin_token"`
		*Alias
	}{
		Alias: (*Alias)(c),
	}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	if aux.AdminToken != "" {
		c.AdminToken = aux.AdminToken
	}
	c.HasAdminToken = c.AdminToken != ""
	return nil
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
