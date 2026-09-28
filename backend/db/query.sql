-- db/query.sql

-- name: CreateUser :one
INSERT INTO users (
  username, password_hash, email
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = $1 LIMIT 1;

-- name: GetUserById :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: CreateKongCluster :one
INSERT INTO kong_clusters (
  name, url, admin_token
) VALUES (
  $1, $2, $3
)
RETURNING *;

-- name: GetKongCluster :one
SELECT * FROM kong_clusters
WHERE id = $1 LIMIT 1;

-- name: ListKongClusters :many
SELECT * FROM kong_clusters
ORDER BY name;

-- name: UpdateKongCluster :one
UPDATE kong_clusters
SET name = $2, url = $3, admin_token = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: DeleteKongCluster :exec
DELETE FROM kong_clusters
WHERE id = $1;

-- name: CreateAuditLog :one
INSERT INTO audit_logs (
  user_id, action, resource, details
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;
