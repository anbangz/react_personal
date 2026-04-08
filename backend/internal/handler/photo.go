package handler

import (
	"fmt"
	"net/http"

	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

// PhotoHandler handles HTTP requests for photo management.
type PhotoHandler struct {
	svc *service.PhotoService
}

// NewPhotoHandler creates a new PhotoHandler.
func NewPhotoHandler(svc *service.PhotoService) *PhotoHandler {
	return &PhotoHandler{svc: svc}
}

// Upload handles POST /admin/photos (multipart/form-data)
func (h *PhotoHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "missing 'file' field: "+err.Error())
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	url, err := h.svc.Upload(r.Context(), header.Filename, contentType, file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("upload failed: %v", err))
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{"url": url})
}

// List handles GET /admin/photos
func (h *PhotoHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("list failed: %v", err))
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"photos": items})
}

// Delete handles DELETE /admin/photos/{key}
func (h *PhotoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "*")
	if key == "" {
		respondError(w, http.StatusBadRequest, "missing photo key")
		return
	}

	if err := h.svc.Delete(r.Context(), key); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("delete failed: %v", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
