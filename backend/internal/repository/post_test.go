package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// These tests require a running MongoDB instance.
// Set MONGODB_URI env var to run them. They are skipped otherwise.

func setupTestDB(t *testing.T) (*mongo.Collection, func()) {
	t.Helper()
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		t.Skip("MONGODB_URI not set, skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	dbName := "anbangz_blog_test_" + time.Now().Format("20060102150405")
	collection := client.Database(dbName).Collection("posts")

	cleanup := func() {
		_ = client.Database(dbName).Drop(context.Background())
		_ = client.Disconnect(context.Background())
	}

	return collection, cleanup
}

func TestMongoPostRepository_CRUD(t *testing.T) {
	collection, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewMongoPostRepository(collection)
	ctx := context.Background()

	// Create
	post := &model.Post{
		Slug:      "test-post",
		Title:     "Test Post",
		Content:   "# Hello\nThis is a test.",
		Photos:    []model.Photo{},
		Published: true,
	}
	if err := repo.Create(ctx, post); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if post.ID.IsZero() {
		t.Fatal("expected non-zero ID after create")
	}

	// FindBySlug
	found, err := repo.FindBySlug(ctx, "test-post", false)
	if err != nil {
		t.Fatalf("FindBySlug: %v", err)
	}
	if found == nil {
		t.Fatal("expected post, got nil")
	}
	if found.Title != "Test Post" {
		t.Errorf("expected title 'Test Post', got '%s'", found.Title)
	}

	// FindPublished
	posts, total, err := repo.FindPublished(ctx, 1, 10)
	if err != nil {
		t.Fatalf("FindPublished: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
	if len(posts) != 1 {
		t.Errorf("expected 1 post, got %d", len(posts))
	}

	// Update
	if err := repo.Update(ctx, "test-post", bson.M{"title": "Updated Title"}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	found, _ = repo.FindBySlug(ctx, "test-post", false)
	if found.Title != "Updated Title" {
		t.Errorf("expected 'Updated Title', got '%s'", found.Title)
	}

	// Delete
	if err := repo.Delete(ctx, "test-post"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	found, _ = repo.FindBySlug(ctx, "test-post", false)
	if found != nil {
		t.Fatal("expected nil after delete")
	}
}
