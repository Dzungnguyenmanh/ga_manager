package repository

import (
	"context"

	"kong-manager-backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type clusterRepository struct {
	pool *pgxpool.Pool
}

func NewClusterRepository(pool *pgxpool.Pool) domain.ClusterRepository {
	return &clusterRepository{
		pool: pool,
	}
}

func (r *clusterRepository) Create(ctx context.Context, cluster *domain.KongCluster) error {
	if cluster.Environment == "" {
		cluster.Environment = "DEV"
	}

	query := `
		INSERT INTO kong_clusters (name, url, admin_token, environment)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var adminToken *string
	if cluster.AdminToken != "" {
		adminToken = &cluster.AdminToken
	}

	return r.pool.QueryRow(ctx, query, cluster.Name, cluster.URL, adminToken, cluster.Environment).Scan(&cluster.ID)
}

func (r *clusterRepository) GetByID(ctx context.Context, id int32) (*domain.KongCluster, error) {
	query := `
		SELECT id, name, url, COALESCE(admin_token, ''), COALESCE(environment, 'DEV')
		FROM kong_clusters
		WHERE id = $1
	`
	var c domain.KongCluster
	err := r.pool.QueryRow(ctx, query, id).Scan(&c.ID, &c.Name, &c.URL, &c.AdminToken, &c.Environment)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *clusterRepository) List(ctx context.Context) ([]domain.KongCluster, error) {
	query := `
		SELECT id, name, url, COALESCE(admin_token, ''), COALESCE(environment, 'DEV')
		FROM kong_clusters
		ORDER BY name
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []domain.KongCluster
	for rows.Next() {
		var c domain.KongCluster
		if err := rows.Scan(&c.ID, &c.Name, &c.URL, &c.AdminToken, &c.Environment); err != nil {
			return nil, err
		}
		clusters = append(clusters, c)
	}
	return clusters, nil
}

func (r *clusterRepository) Update(ctx context.Context, cluster *domain.KongCluster) error {
	if cluster.Environment == "" {
		cluster.Environment = "DEV"
	}
	query := `
		UPDATE kong_clusters
		SET name = $2, url = $3, admin_token = $4, environment = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	var adminToken *string
	if cluster.AdminToken != "" {
		adminToken = &cluster.AdminToken
	}

	_, err := r.pool.Exec(ctx, query, cluster.ID, cluster.Name, cluster.URL, adminToken, cluster.Environment)
	return err
}

func (r *clusterRepository) Delete(ctx context.Context, id int32) error {
	query := `DELETE FROM kong_clusters WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}
