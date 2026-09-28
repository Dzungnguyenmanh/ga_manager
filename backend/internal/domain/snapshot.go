package domain

import (
	"context"
	"time"
)

type Snapshot struct {
	ID          int64                  `json:"id"`
	ClusterID   int32                  `json:"cluster_id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	ConfigJSON  *KongDeclarativeConfig `json:"config_json"`
	CreatedAt   time.Time              `json:"created_at"`
}

type SnapshotRepository interface {
	Create(ctx context.Context, snapshot *Snapshot) (*Snapshot, error)
	ListByClusterID(ctx context.Context, clusterID int32) ([]Snapshot, error)
	GetByID(ctx context.Context, id int64) (*Snapshot, error)
	Delete(ctx context.Context, id int64) error
}
