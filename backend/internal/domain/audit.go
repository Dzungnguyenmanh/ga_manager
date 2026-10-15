package domain

import (
	"context"
	"time"
)

type AuditLog struct {
	ID         int64          `json:"id"`
	ClusterID  *int32         `json:"cluster_id,omitempty"`
	UserID     *int32         `json:"user_id,omitempty"`
	Username   string         `json:"username"`
	Action     string         `json:"action"` // CREATE, UPDATE, DELETE, RESTORE_SNAPSHOT, SYNC_CONFIG
	Resource   string         `json:"resource"` // service, route, plugin, consumer, upstream, target, certificate, snapshot
	ResourceID string         `json:"resource_id,omitempty"`
	Details    map[string]any `json:"details,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

type AuditRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	List(ctx context.Context, clusterID *int32, limit, offset int) ([]AuditLog, int64, error)
}
