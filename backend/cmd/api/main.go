package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"kong-manager-backend/internal/delivery/http/handlers"
	"kong-manager-backend/internal/delivery/http/middlewares"
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
		role VARCHAR(50) DEFAULT 'admin',
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);

	ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';

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
	userRepo := repository.NewUserRepository(pool)
	kongClient := kong.NewKongClient()

	// Seed default admin user in DB
	seedCtx, seedCancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := repository.SeedDefaultAdminUser(seedCtx, userRepo); err != nil {
		log.Printf("Notice on user seeding: %v", err)
	}
	seedCancel()

	// 3. Initialize Usecases
	jwtSecret := middlewares.GetJWTSecret()
	clusterUsecase := usecase.NewClusterUsecase(clusterRepo)
	kongUsecase := usecase.NewKongUsecase(kongClient, clusterRepo, snapshotRepo, auditRepo)
	authUsecase := usecase.NewAuthUsecase(userRepo, jwtSecret)

	// 4. Initialize Handlers
	clusterHandler := handlers.NewClusterHandler(clusterUsecase)
	kongHandler := handlers.NewKongHandler(kongUsecase, auditRepo)
	authHandler := handlers.NewAuthHandler(authUsecase)

	// 5. Setup Router
	r := router.SetupRouter(clusterHandler, kongHandler, authHandler)

	// 6. Start Server with explicit timeouts (VULN-11) and Graceful Shutdown
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:           ":" + port,
		Handler:        r,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	go func() {
		log.Printf("Server listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT or SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exiting cleanly.")
}
