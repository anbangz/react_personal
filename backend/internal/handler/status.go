package handler

import (
	"context"
	"net/http"

	"github.com/anbangz/react_personal/backend/internal/model"
)

type statusSnapshotProvider interface {
	GetSnapshot(ctx context.Context) (model.StatusSnapshot, error)
}

type StatusHandler struct {
	service statusSnapshotProvider
}

func NewStatusHandler(service statusSnapshotProvider) *StatusHandler {
	return &StatusHandler{service: service}
}

func (h *StatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	snapshot, err := h.service.GetSnapshot(r.Context())
	if err != nil {
		respondError(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, snapshot)
}
