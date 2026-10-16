package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/router"
	"kong-manager-backend/internal/infrastructure/kong"
	"kong-manager-backend/internal/repository"
	"kong-manager-backend/internal/usecase"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initDatabaseSchema(ctx context.Context, pool *pgxpool.Pool) error {
	schema := `
	CREATE TABLE IF NOT EXISTS kong_clusters (
		id SERIAL PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		url VARCHAR(255) NOT NULL,
		admin_token VARCHAR(255),
		environment VARCHAR(20) DEFAULT 'DEV',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	ALTER TABLE kong_clusters ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'DEV';

	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username VARCHAR(50) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS snapshots (
		id SERIAL PRIMARY KEY,
		cluster_id INT NOT NULL,
		name VARCHAR(150) NOT NULL,
		description TEXT,
		config_json JSONB NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS audit_logs (
		id SERIAL PRIMARY KEY,
		cluster_id INT,
		user_id INT,
		username VARCHAR(50),
		action VARCHAR(100) NOT NULL,
		resource VARCHAR(100) NOT NULL,
		resource_id VARCHAR(100),
		details JSONB,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := pool.Exec(ctx, schema)
	return err
}

func main() {
	log.Println("Starting Gateway Manager Backend...")

	// 1. Connect to PostgreSQL
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		host := os.Getenv("DB_HOST")
		if host == "" {
			// Auto-detect Kubernetes environment
			if os.Getenv("KUBERNETES_SERVICE_HOST") != "" {
				host = "kong-manager-postgres"
			} else {
				host = "localhost"
			}
		}
		port := os.Getenv("DB_PORT")
		if port == "" {
			port = "5432"
		}
		user := os.Getenv("DB_USER")
		if user == "" {
			user = "kongmanager"
		}
		password := os.Getenv("DB_PASSWORD")
		if password == "" {
			password = "kongmanager_password"
		}
		dbname := os.Getenv("DB_NAME")
		if dbname == "" {
			dbname = "kongmanager"
		}
		sslmode := os.Getenv("DB_SSLMODE")
		if sslmode == "" {
			sslmode = "disable"
		}
		dbUrl = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, password, host, port, dbname, sslmode)
	}

	maskedUrl := dbUrl
	if parsed, err := url.Parse(dbUrl); err == nil {
		maskedUrl = parsed.Redacted()
	}
	log.Printf("Connecting to database: %s", maskedUrl)

	poolConfig, err := pgxpool.ParseConfig(dbUrl)
	if err != nil {
		log.Fatalf("Invalid database connection string: %v\n", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// Verify database connection with timeout
	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := pool.Ping(pingCtx); err != nil {
		log.Printf("Warning: Database ping failed: %v (backend will continue and retry on requests)", err)
	} else {
		log.Println("Database connection successfully established and verified.")
	}
	pingCancel()

	// Ensure tables exist in database
	schemaCtx, schemaCancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := initDatabaseSchema(schemaCtx, pool); err != nil {
		log.Printf("Warning: Failed to init schema: %v\n", err)
	} else {
		log.Println("Database schema checked and verified successfully.")
	}
	schemaCancel()

	// 2. Initialize Repositories and Infrastructure
	clusterRepo := repository.NewClusterRepository(pool)
	snapshotRepo := repository.NewSnapshotRepository(pool)
	auditRepo := repository.NewAuditRepository(pool)
	kongClient := kong.NewKongClient()

	// 3. Initialize Usecases
	clusterUsecase := usecase.NewClusterUsecase(clusterRepo)
	kongUsecase := usecase.NewKongUsecase(kongClient, clusterRepo, snapshotRepo, auditRepo)

	// 4. Initialize Handlers
	clusterHandler := handlers.NewClusterHandler(clusterUsecase)
	kongHandler := handlers.NewKongHandler(kongUsecase, auditRepo)

	// 5. Setup Router
	r := router.SetupRouter(clusterHandler, kongHandler)

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
