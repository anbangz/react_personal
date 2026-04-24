package service

import (
	"context"
	"testing"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// mockPostRepo is a simple in-memory mock for testing.
type mockPostRepo struct {
	posts []model.Post
}

func (m *mockPostRepo) FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	var result []model.Post
	for _, p := range m.posts {
		if p.Published {
			result = append(result, p)
		}
	}
	total := int64(len(result))
	start := (page - 1) * limit
	if start >= len(result) {
		return []model.Post{}, total, nil
	}
	end := start + limit
	if end > len(result) {
		end = len(result)
	}
	return result[start:end], total, nil
}

func (m *mockPostRepo) FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	total := int64(len(m.posts))
	start := (page - 1) * limit
	if start >= len(m.posts) {
		return []model.Post{}, total, nil
	}
	end := start + limit
	if end > len(m.posts) {
		end = len(m.posts)
	}
	return m.posts[start:end], total, nil
}

func (m *mockPostRepo) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			if publishedOnly && !m.posts[i].Published {
				return nil, nil
			}
			return &m.posts[i], nil
		}
	}
	return nil, nil
}

func (m *mockPostRepo) Create(ctx context.Context, post *model.Post) error {
	post.ID = primitive.NewObjectID()
	m.posts = append(m.posts, *post)
	return nil
}

func (m *mockPostRepo) Update(ctx context.Context, slug string, update bson.M) error {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			if title, ok := update["title"]; ok {
				m.posts[i].Title = title.(string)
			}
			if summary, ok := update["summary"]; ok {
				m.posts[i].Summary = summary.(string)
			}
			if content, ok := update["content"]; ok {
				m.posts[i].Content = content.(string)
			}
			if published, ok := update["published"]; ok {
				m.posts[i].Published = published.(bool)
			}
			return nil
		}
	}
	return nil
}

func (m *mockPostRepo) Delete(ctx context.Context, slug string) error {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			m.posts = append(m.posts[:i], m.posts[i+1:]...)
			return nil
		}
	}
	return nil
}

func TestPostService_Create_Valid(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	post, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug:      "hello-world",
		Title:     "Hello World",
		Content:   "# Hello",
		Published: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Slug != "hello-world" {
		t.Errorf("expected slug 'hello-world', got '%s'", post.Slug)
	}
}

func TestPostService_Create_DuplicateSlug(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, _ = svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "hello-world", Title: "First", Published: true,
	})
	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "hello-world", Title: "Second", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for duplicate slug")
	}
}

func TestPostService_Create_InvalidSlug(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "Hello World!", Title: "Bad Slug", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for invalid slug")
	}
}

func TestPostService_Create_EmptyTitle(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "test", Title: "", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for empty title")
	}
}

func TestTruncateContent(t *testing.T) {
	short := "hello"
	if TruncateContent(short, 300) != "hello" {
		t.Error("should not truncate short content")
	}
	long := make([]byte, 500)
	for i := range long {
		long[i] = 'a'
	}
	result := TruncateContent(string(long), 300)
	if len(result) != 303 { // 300 + "..."
		t.Errorf("expected length 303, got %d", len(result))
	}
}

func TestTruncateContent_UTF8Safe(t *testing.T) {
	input := "你好世界"
	got := TruncateContent(input, 3)
	if got != "你好世..." {
		t.Fatalf("expected UTF-8 safe truncation, got %q", got)
	}
}

func TestPostService_Create_WithSummary(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	post, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug:      "summary-test",
		Title:     "Summary Test",
		Summary:   "A short summary for the feed.",
		Content:   "# Full content here",
		Published: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Summary != "A short summary for the feed." {
		t.Errorf("expected summary to be set, got %q", post.Summary)
	}
}

func TestPostService_Update_Summary(t *testing.T) {
	repo := &mockPostRepo{
		posts: []model.Post{{
			ID:        primitive.NewObjectID(),
			Slug:      "summary-update-test",
			Title:     "Original Title",
			Content:   "# Original content",
			Published: true,
		}},
	}
	svc := NewPostService(repo)
	ctx := context.Background()

	firstSummary := "First summary value"
	updatedPost, err := svc.Update(ctx, "summary-update-test", model.UpdatePostRequest{
		Summary: &firstSummary,
	})
	if err != nil {
		t.Fatalf("unexpected error setting initial summary: %v", err)
	}
	if updatedPost.Summary != firstSummary {
		t.Fatalf("expected summary %q, got %q", firstSummary, updatedPost.Summary)
	}

	secondSummary := "Second summary value"
	updatedPost, err = svc.Update(ctx, "summary-update-test", model.UpdatePostRequest{
		Summary: &secondSummary,
	})
	if err != nil {
		t.Fatalf("unexpected error overwriting summary: %v", err)
	}
	if updatedPost.Summary != secondSummary {
		t.Fatalf("expected summary %q, got %q", secondSummary, updatedPost.Summary)
	}

	newTitle := "Retitled Post"
	updatedPost, err = svc.Update(ctx, "summary-update-test", model.UpdatePostRequest{
		Title: &newTitle,
	})
	if err != nil {
		t.Fatalf("unexpected error updating title without summary: %v", err)
	}
	if updatedPost.Title != newTitle {
		t.Fatalf("expected title %q, got %q", newTitle, updatedPost.Title)
	}
	if updatedPost.Summary != secondSummary {
		t.Fatalf("expected summary to remain %q, got %q", secondSummary, updatedPost.Summary)
	}
}
