package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/anbangz/react_personal/backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// PostService handles business logic for blog posts.
type PostService struct {
	repo repository.PostRepository
}

// NewPostService creates a new PostService.
func NewPostService(repo repository.PostRepository) *PostService {
	return &PostService{repo: repo}
}

// ListPublished returns published posts with pagination.
func (s *PostService) ListPublished(ctx context.Context, page, limit int) (*model.PaginatedResponse, error) {
	page, limit = normalizePagination(page, limit)
	posts, total, err := s.repo.FindPublished(ctx, page, limit)
	if err != nil {
		return nil, err
	}
	return &model.PaginatedResponse{Posts: posts, Total: total, Page: page, Limit: limit}, nil
}

// ListAll returns all posts (including drafts) with pagination.
func (s *PostService) ListAll(ctx context.Context, page, limit int) (*model.PaginatedResponse, error) {
	page, limit = normalizePagination(page, limit)
	posts, total, err := s.repo.FindAll(ctx, page, limit)
	if err != nil {
		return nil, err
	}
	return &model.PaginatedResponse{Posts: posts, Total: total, Page: page, Limit: limit}, nil
}

// GetBySlug returns a single post by slug.
func (s *PostService) GetBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	return s.repo.FindBySlug(ctx, slug, publishedOnly)
}

// Create validates and creates a new post.
func (s *PostService) Create(ctx context.Context, req model.CreatePostRequest) (*model.Post, error) {
	if err := validateCreateRequest(req); err != nil {
		return nil, err
	}

	// Check for duplicate slug
	existing, err := s.repo.FindBySlug(ctx, req.Slug, false)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("slug already exists: %s", req.Slug)
	}

	post := &model.Post{
		Slug:      req.Slug,
		Title:     req.Title,
		Summary:   req.Summary,
		Content:   req.Content,
		Photos:    req.Photos,
		Published: req.Published,
	}
	if err := s.repo.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

// Update applies partial updates to an existing post.
func (s *PostService) Update(ctx context.Context, slug string, req model.UpdatePostRequest) (*model.Post, error) {
	update := bson.M{}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, fmt.Errorf("title cannot be empty")
		}
		update["title"] = title
	}
	if req.Content != nil {
		update["content"] = *req.Content
	}
	if req.Summary != nil {
		update["summary"] = *req.Summary
	}
	if req.Photos != nil {
		update["photos"] = *req.Photos
	}
	if req.Published != nil {
		update["published"] = *req.Published
	}
	if len(update) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	if err := s.repo.Update(ctx, slug, update); err != nil {
		return nil, err
	}
	return s.repo.FindBySlug(ctx, slug, false)
}

// Delete removes a post by slug and returns the deleted post (for photo cleanup).
func (s *PostService) Delete(ctx context.Context, slug string) (*model.Post, error) {
	post, err := s.repo.FindBySlug(ctx, slug, false)
	if err != nil {
		return nil, err
	}
	if post == nil {
		return nil, fmt.Errorf("post not found: %s", slug)
	}
	if err := s.repo.Delete(ctx, slug); err != nil {
		return nil, err
	}
	return post, nil
}

// TruncateContent truncates post content for feed listings.
func TruncateContent(content string, maxLen int) string {
	runes := []rune(content)
	if len(runes) <= maxLen {
		return content
	}
	return string(runes[:maxLen]) + "..."
}

func validateCreateRequest(req model.CreatePostRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("title is required")
	}
	if strings.TrimSpace(req.Slug) == "" {
		return fmt.Errorf("slug is required")
	}
	if !slugRegex.MatchString(req.Slug) {
		return fmt.Errorf("slug must be lowercase alphanumeric with hyphens (e.g. 'my-post')")
	}
	return nil
}

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return page, limit
}
