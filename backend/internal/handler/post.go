package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/anbangz/react_personal/backend/internal/logger"
	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

// PostHandler handles HTTP requests for blog posts.
type PostHandler struct {
	svc *service.PostService
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(svc *service.PostService) *PostHandler {
	return &PostHandler{svc: svc}
}

// ListPublished handles GET /posts
func (h *PostHandler) ListPublished(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	result, err := h.svc.ListPublished(r.Context(), page, limit)
	if err != nil {
		logger.Error(r.Context(), "failed to list published posts", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Truncate content for feed
	for i := range result.Posts {
		result.Posts[i].Content = service.TruncateContent(result.Posts[i].Content, 300)
	}

	respondJSON(w, http.StatusOK, result)
}

// GetBySlug handles GET /posts/{slug}
func (h *PostHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	post, err := h.svc.GetBySlug(r.Context(), slug, true)
	if err != nil {
		logger.Error(r.Context(), "failed to get post by slug", err, "slug", slug)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		logger.Warn(r.Context(), "post not found", "slug", slug)
		respondError(w, http.StatusNotFound, "post not found")
		return
	}
	respondJSON(w, http.StatusOK, post)
}

// ListAll handles GET /admin/posts
func (h *PostHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	result, err := h.svc.ListAll(r.Context(), page, limit)
	if err != nil {
		logger.Error(r.Context(), "failed to list all posts", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, result)
}

// Create handles POST /admin/posts
func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	post, err := h.svc.Create(r.Context(), req)
	if err != nil {
		if isClientPostError(err) {
			logger.Warn(r.Context(), "client error creating post", "error", err.Error())
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		logger.Error(r.Context(), "failed to create post", err)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	logger.Info(r.Context(), "post created", "slug", post.Slug, "title", post.Title)
	respondJSON(w, http.StatusCreated, post)
}

// Update handles PUT /admin/posts/{slug}
func (h *PostHandler) Update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var req model.UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	post, err := h.svc.Update(r.Context(), slug, req)
	if err != nil {
		if strings.Contains(err.Error(), "post not found") {
			logger.Warn(r.Context(), "post not found for update", "slug", slug)
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		if isClientPostError(err) {
			logger.Warn(r.Context(), "client error updating post", "error", err.Error())
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		logger.Error(r.Context(), "failed to update post", err, "slug", slug)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	logger.Info(r.Context(), "post updated", "slug", post.Slug)
	respondJSON(w, http.StatusOK, post)
}

// Delete handles DELETE /admin/posts/{slug}
func (h *PostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	_, err := h.svc.Delete(r.Context(), slug)
	if err != nil {
		if strings.Contains(err.Error(), "post not found") {
			logger.Warn(r.Context(), "post not found for delete", "slug", slug)
			respondError(w, http.StatusNotFound, err.Error())
			return
		}
		logger.Error(r.Context(), "failed to delete post", err, "slug", slug)
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	logger.Info(r.Context(), "post deleted", "slug", slug)
	w.WriteHeader(http.StatusNoContent)
}

func isClientPostError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "title is required") ||
		strings.Contains(msg, "slug is required") ||
		strings.Contains(msg, "slug must") ||
		strings.Contains(msg, "slug already exists") ||
		strings.Contains(msg, "title cannot be empty") ||
		strings.Contains(msg, "no fields to update")
}

func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, model.ErrorResponse{Error: msg})
}
