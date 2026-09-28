package repository

import (
	"context"
	"encoding/json"
	"time"

	"kong-manager-backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type snapshotRepository struct {
	pool *pgxpool.Pool
}

func NewSnapshotRepository(pool *pgxpool.Pool) domain.SnapshotRepository {
	return &snapshotRepository{
		pool: pool,
	}
}

func (r *snapshotRepository) Create(ctx context.Context, snapshot *domain.Snapshot) (*domain.Snapshot, error) {
	configBytes, err := json.Marshal(snapshot.ConfigJSON)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO snapshots (cluster_id, name, description, config_json, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	now := time.Now()
	var id int64
	var createdAt time.Time

	err = r.pool.QueryRow(ctx, query, snapshot.ClusterID, snapshot.Name, snapshot.Description, configBytes, now).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}

	snapshot.ID = id
	snapshot.CreatedAt = createdAt
	return snapshot, nil
}

func (r *snapshotRepository) ListByClusterID(ctx context.Context, clusterID int32) ([]domain.Snapshot, error) {
	query := `
		SELECT id, cluster_id, name, description, config_json, created_at
		FROM snapshots
		WHERE cluster_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, clusterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []domain.Snapshot
	for rows.Next() {
		var s domain.Snapshot
		var configBytes []byte
		if err := rows.Scan(&s.ID, &s.ClusterID, &s.Name, &s.Description, &configBytes, &s.CreatedAt); err != nil {
			return nil, err
		}
		var cfg domain.KongDeclarativeConfig
		if err := json.Unmarshal(configBytes, &cfg); err == nil {
			s.ConfigJSON = &cfg
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, nil
}

func (r *snapshotRepository) GetByID(ctx context.Context, id int64) (*domain.Snapshot, error) {
	query := `
		SELECT id, cluster_id, name, description, config_json, created_at
		FROM snapshots
		WHERE id = $1
	`
	var s domain.Snapshot
	var configBytes []byte
	err := r.pool.QueryRow(ctx, query, id).Scan(&s.ID, &s.ClusterID, &s.Name, &s.Description, &configBytes, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	var cfg domain.KongDeclarativeConfig
	if err := json.Unmarshal(configBytes, &cfg); err == nil {
		s.ConfigJSON = &cfg
	}
	return &s, nil
}

func (r *snapshotRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM snapshots WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
