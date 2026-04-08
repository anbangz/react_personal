package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PostRepository defines data access operations for posts.
type PostRepository interface {
	FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error)
	FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error)
	FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error)
	Create(ctx context.Context, post *model.Post) error
	Update(ctx context.Context, slug string, update bson.M) error
	Delete(ctx context.Context, slug string) error
}

// MongoPostRepository implements PostRepository using MongoDB.
type MongoPostRepository struct {
	collection *mongo.Collection
}

// NewMongoPostRepository creates a new repository backed by the given collection.
func NewMongoPostRepository(collection *mongo.Collection) *MongoPostRepository {
	return &MongoPostRepository{collection: collection}
}

func (r *MongoPostRepository) findPaginated(ctx context.Context, filter bson.M, page, limit int) ([]model.Post, int64, error) {
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("count documents: %w", err)
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("find: %w", err)
	}
	defer cursor.Close(ctx)

	var posts []model.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, 0, fmt.Errorf("decode: %w", err)
	}
	if posts == nil {
		posts = []model.Post{}
	}
	return posts, total, nil
}

func (r *MongoPostRepository) FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	return r.findPaginated(ctx, bson.M{"published": true}, page, limit)
}

func (r *MongoPostRepository) FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	return r.findPaginated(ctx, bson.M{}, page, limit)
}

func (r *MongoPostRepository) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	filter := bson.M{"slug": slug}
	if publishedOnly {
		filter["published"] = true
	}

	var post model.Post
	err := r.collection.FindOne(ctx, filter).Decode(&post)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("find one: %w", err)
	}
	return &post, nil
}

func (r *MongoPostRepository) Create(ctx context.Context, post *model.Post) error {
	post.ID = primitive.NewObjectID()
	now := time.Now().UTC()
	post.CreatedAt = now
	post.UpdatedAt = now
	if post.Photos == nil {
		post.Photos = []model.Photo{}
	}

	_, err := r.collection.InsertOne(ctx, post)
	if err != nil {
		return fmt.Errorf("insert: %w", err)
	}
	return nil
}

func (r *MongoPostRepository) Update(ctx context.Context, slug string, update bson.M) error {
	update["updatedAt"] = time.Now().UTC()
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"slug": slug},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("update: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("post not found: %s", slug)
	}
	return nil
}

func (r *MongoPostRepository) Delete(ctx context.Context, slug string) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"slug": slug})
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("post not found: %s", slug)
	}
	return nil
}
