package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/anbangz/react_personal/backend/internal/handler"
	"github.com/anbangz/react_personal/backend/internal/repository"
	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/aws/aws-lambda-go/lambda"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	local := flag.Bool("local", false, "run as local HTTP server instead of Lambda")
	port := flag.String("port", "8081", "local server port")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Config from environment
	mongoURI := mustEnv("MONGODB_URI")
	apiKey := mustEnv("API_KEY")
	s3Bucket := mustEnv("S3_BUCKET")
	cdnURL := mustEnv("PHOTOS_CDN_URL")
	allowedOrigin := getEnv("ALLOWED_ORIGIN", "https://anbangz.me")

	// Connect to MongoDB
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongodb connect: %v", err)
	}
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("mongodb ping: %v", err)
	}
	log.Println("Connected to MongoDB")

	dbName := getEnv("MONGODB_DATABASE", "anbangz_blog_prod")
	collection := mongoClient.Database(dbName).Collection("posts")

	// Build services
	postRepo := repository.NewMongoPostRepository(collection)
	postSvc := service.NewPostService(postRepo)

	// S3 client
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("aws config: %v", err)
	}
	s3Client := s3.NewFromConfig(awsCfg)
	photoSvc := service.NewPhotoService(s3Client, s3Bucket, cdnURL)

	// Build router
	router := handler.NewRouter(handler.RouterConfig{
		MongoClient:   mongoClient,
		PostHandler:   handler.NewPostHandler(postSvc),
		PhotoHandler:  handler.NewPhotoHandler(photoSvc),
		APIKey:        apiKey,
		AllowedOrigin: allowedOrigin,
	})

	if *local {
		addr := fmt.Sprintf(":%s", *port)
		log.Printf("Starting local server on %s", addr)
		log.Fatal(http.ListenAndServe(addr, router))
	} else {
		lambda.Start(httpadapter.NewV2(router).ProxyWithContext)
	}
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
