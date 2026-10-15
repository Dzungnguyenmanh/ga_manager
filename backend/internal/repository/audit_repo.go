package repository

import (
	"context"
	"encoding/json"
	"time"

	"kong-manager-backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type auditRepository struct {
	pool *pgxpool.Pool
}

func NewAuditRepository(pool *pgxpool.Pool) domain.AuditRepository {
	return &auditRepository{
		pool: pool,
	}
}

func (r *auditRepository) Create(ctx context.Context, log *domain.AuditLog) error {
	query := `
		INSERT INTO audit_logs (cluster_id, user_id, username, action, resource, resource_id, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	detailsBytes, err := json.Marshal(log.Details)
	if err != nil {
		detailsBytes = []byte("{}")
	}

	now := time.Now()
	var id int64
	var createdAt time.Time

	err = r.pool.QueryRow(
		ctx,
		query,
		log.ClusterID,
		log.UserID,
		log.Username,
		log.Action,
		log.Resource,
		log.ResourceID,
		detailsBytes,
		now,
	).Scan(&id, &createdAt)
	if err != nil {
		return err
	}

	log.ID = id
	log.CreatedAt = createdAt
	return nil
}

func (r *auditRepository) List(ctx context.Context, clusterID *int32, limit, offset int) ([]domain.AuditLog, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	var countQuery string
	var listQuery string
	var rowsArgs []any
	var countArgs []any

	if clusterID != nil && *clusterID > 0 {
		countQuery = `SELECT COUNT(*) FROM audit_logs WHERE cluster_id = $1`
		countArgs = []any{*clusterID}

		listQuery = `
			SELECT id, cluster_id, user_id, username, action, resource, resource_id, details, created_at
			FROM audit_logs
			WHERE cluster_id = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`
		rowsArgs = []any{*clusterID, limit, offset}
	} else {
		countQuery = `SELECT COUNT(*) FROM audit_logs`
		listQuery = `
			SELECT id, cluster_id, user_id, username, action, resource, resource_id, details, created_at
			FROM audit_logs
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`
		rowsArgs = []any{limit, offset}
	}

	var total int64
	err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		// In case table or query fails
		total = 0
	}

	rows, err := r.pool.Query(ctx, listQuery, rowsArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		var detailsBytes []byte
		err := rows.Scan(
			&l.ID,
			&l.ClusterID,
			&l.UserID,
			&l.Username,
			&l.Action,
			&l.Resource,
			&l.ResourceID,
			&detailsBytes,
			&l.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		if len(detailsBytes) > 0 {
			var details map[string]any
			if jsonErr := json.Unmarshal(detailsBytes, &details); jsonErr == nil {
				l.Details = details
			}
		}
		logs = append(logs, l)
	}

	return logs, total, nil
}
