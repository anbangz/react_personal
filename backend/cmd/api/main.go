package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/anbangz/react_personal/backend/internal/handler"
	"github.com/anbangz/react_personal/backend/internal/logger"
	"github.com/anbangz/react_personal/backend/internal/repository"
	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/aws/aws-lambda-go/lambda"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/codepipeline"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	local := flag.Bool("local", false, "run as local HTTP server instead of Lambda")
	port := flag.String("port", "8081", "local server port")
	flag.Parse()
	logger.Init(os.Stdout)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// AWS clients used by runtime services
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		slog.Error("aws config", "error", err)
		os.Exit(1)
	}
	smClient := secretsmanager.NewFromConfig(awsCfg)

	// Config from environment (optionally secret-backed)
	mongoURI, err := resolveEnvOrSecret(ctx, smClient, "MONGODB_URI", "MONGODB_URI_SECRET_ARN")
	if err != nil {
		slog.Error("mongodb uri config", "error", err)
		os.Exit(1)
	}
	apiKey, err := resolveEnvOrSecret(ctx, smClient, "API_KEY", "API_KEY_SECRET_ARN")
	if err != nil {
		slog.Error("api key config", "error", err)
		os.Exit(1)
	}
	s3Bucket := mustEnv("S3_BUCKET")
	cdnURL := mustEnv("PHOTOS_CDN_URL")
	allowedOrigin := getEnv("ALLOWED_ORIGIN", "https://anbangz.me")

	// Connect to MongoDB
	dbName := getEnv("MONGODB_DATABASE", "anbangz_blog_prod")
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		slog.Error("mongodb connect", "error", err)
		os.Exit(1)
	}
	if err := mongoClient.Ping(ctx, nil); err != nil {
		slog.Error("mongodb ping", "error", err)
		os.Exit(1)
	}
	slog.Info("connected to MongoDB", "database", dbName)

	collection := mongoClient.Database(dbName).Collection("posts")

	// Build services
	postRepo := repository.NewMongoPostRepository(collection)
	postSvc := service.NewPostService(postRepo)

	// S3 client
	s3Client := s3.NewFromConfig(awsCfg)
	photoSvc := service.NewPhotoService(s3Client, s3Bucket, cdnURL)

	// Status service
	pipelineClient := codepipeline.NewFromConfig(awsCfg)
	statusSvc := service.NewStatusService(
		service.NewCodePipelineStatusFetcher(pipelineClient),
		15*time.Minute,
		time.Now,
	)

	// Build router
	router := handler.NewRouter(handler.RouterConfig{
		MongoClient:   mongoClient,
		PostHandler:   handler.NewPostHandler(postSvc),
		PhotoHandler:  handler.NewPhotoHandler(photoSvc),
		StatusHandler: handler.NewStatusHandler(statusSvc),
		APIKey:        apiKey,
		AllowedOrigin: allowedOrigin,
	})

	if *local {
		addr := fmt.Sprintf(":%s", *port)
		slog.Info("starting local server", "address", addr)
		if err := http.ListenAndServe(addr, router); err != nil {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	} else {
		lambda.Start(httpadapter.NewV2(router).ProxyWithContext)
	}
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		slog.Error("required environment variable is not set", "variable", key)
		os.Exit(1)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func resolveEnvOrSecret(
	ctx context.Context,
	smClient *secretsmanager.Client,
	envKey string,
	secretArnEnvKey string,
) (string, error) {
	envValue := os.Getenv(envKey)
	if envValue != "" && !strings.HasPrefix(envValue, "PLACEHOLDER_") {
		return envValue, nil
	}

	secretArn := os.Getenv(secretArnEnvKey)
	if secretArn == "" {
		if envValue == "" {
			return "", fmt.Errorf("required environment variable %s is not set", envKey)
		}
		return "", fmt.Errorf("%s is placeholder but %s is not set", envKey, secretArnEnvKey)
	}

	secretValue, err := smClient.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: &secretArn,
	})
	if err != nil {
		return "", fmt.Errorf("get secret %s: %w", secretArnEnvKey, err)
	}
	if secretValue.SecretString == nil || strings.TrimSpace(*secretValue.SecretString) == "" {
		return "", fmt.Errorf("secret %s is empty", secretArnEnvKey)
	}

	return *secretValue.SecretString, nil
}
