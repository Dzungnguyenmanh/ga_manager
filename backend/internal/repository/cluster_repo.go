package repository

import (
	"context"

	"kong-manager-backend/internal/domain"
	"kong-manager-backend/internal/repository/db"

	"github.com/jackc/pgx/v5/pgtype"
)

type clusterRepository struct {
	q *db.Queries
}

func NewClusterRepository(queries *db.Queries) domain.ClusterRepository {
	return &clusterRepository{
		q: queries,
	}
}

func (r *clusterRepository) Create(ctx context.Context, cluster *domain.KongCluster) error {
	arg := db.CreateKongClusterParams{
		Name: cluster.Name,
		Url:  cluster.URL,
	}
	if cluster.AdminToken != "" {
		arg.AdminToken = pgtype.Text{String: cluster.AdminToken, Valid: true}
	} else {
		arg.AdminToken = pgtype.Text{Valid: false}
	}

	res, err := r.q.CreateKongCluster(ctx, arg)
	if err != nil {
		return err
	}
	cluster.ID = res.ID
	return nil
}

func (r *clusterRepository) GetByID(ctx context.Context, id int32) (*domain.KongCluster, error) {
	res, err := r.q.GetKongCluster(ctx, id)
	if err != nil {
		return nil, err
	}
	return &domain.KongCluster{
		ID:         res.ID,
		Name:       res.Name,
		URL:        res.Url,
		AdminToken: res.AdminToken.String,
	}, nil
}

func (r *clusterRepository) List(ctx context.Context) ([]domain.KongCluster, error) {
	rows, err := r.q.ListKongClusters(ctx)
	if err != nil {
		return nil, err
	}
	var clusters []domain.KongCluster
	for _, row := range rows {
		clusters = append(clusters, domain.KongCluster{
			ID:         row.ID,
			Name:       row.Name,
			URL:        row.Url,
			AdminToken: row.AdminToken.String,
		})
	}
	return clusters, nil
}

func (r *clusterRepository) Update(ctx context.Context, cluster *domain.KongCluster) error {
	arg := db.UpdateKongClusterParams{
		ID:   cluster.ID,
		Name: cluster.Name,
		Url:  cluster.URL,
	}
	if cluster.AdminToken != "" {
		arg.AdminToken = pgtype.Text{String: cluster.AdminToken, Valid: true}
	} else {
		arg.AdminToken = pgtype.Text{Valid: false}
	}

	_, err := r.q.UpdateKongCluster(ctx, arg)
	return err
}

func (r *clusterRepository) Delete(ctx context.Context, id int32) error {
	return r.q.DeleteKongCluster(ctx, id)
}
