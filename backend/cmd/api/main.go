package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/router"
	"kong-manager-backend/internal/infrastructure/kong"
	"kong-manager-backend/internal/repository"
	"kong-manager-backend/internal/repository/db"
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
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

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
	`
	_, err := pool.Exec(ctx, schema)
	return err
}

func main() {
	log.Println("Starting Kong Manager Backend...")

	// 1. Connect to PostgreSQL
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://kongmanager:kongmanager_password@localhost:5432/kongmanager?sslmode=disable"
	}
	
	pool, err := pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// Ensure tables exist in database
	if err := initDatabaseSchema(context.Background(), pool); err != nil {
		log.Printf("Warning: Failed to init schema: %v\n", err)
	} else {
		log.Println("Database schema checked and verified successfully.")
	}

	queries := db.New(pool)

	// 2. Initialize Repositories and Infrastructure
	clusterRepo := repository.NewClusterRepository(queries)
	snapshotRepo := repository.NewSnapshotRepository(pool)
	kongClient := kong.NewKongClient()

	// 3. Initialize Usecases
	clusterUsecase := usecase.NewClusterUsecase(clusterRepo)
	kongUsecase := usecase.NewKongUsecase(kongClient, clusterRepo, snapshotRepo)

	// 4. Initialize Handlers
	clusterHandler := handlers.NewClusterHandler(clusterUsecase)
	kongHandler := handlers.NewKongHandler(kongUsecase)

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
