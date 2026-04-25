package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/anbangz/react_personal/backend/internal/logger"
	"go.mongodb.org/mongo-driver/mongo"
)

// HealthHandler checks API and MongoDB health.
type HealthHandler struct {
	mongoClient *mongo.Client
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(mongoClient *mongo.Client) *HealthHandler {
	return &HealthHandler{mongoClient: mongoClient}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	status := "ok"
	mongoStatus := "connected"

	if err := h.mongoClient.Ping(ctx, nil); err != nil {
		status = "degraded"
		mongoStatus = "disconnected: " + err.Error()
		logger.Warn(r.Context(), "health check degraded", "mongodb", mongoStatus)
	} else {
		logger.Info(r.Context(), "health check ok")
	}

	w.Header().Set("Content-Type", "application/json")
	if status != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(map[string]string{
		"status":  status,
		"mongodb": mongoStatus,
	})
}
