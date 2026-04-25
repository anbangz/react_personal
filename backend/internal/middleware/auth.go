package middleware

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

// APIKeyAuth returns middleware that validates the X-API-Key header.
func APIKeyAuth(apiKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			provided := r.Header.Get("X-API-Key")
			if provided == "" {
				logger.Warn(r.Context(), "missing API key")
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing X-API-Key header"})
				return
			}
			if subtle.ConstantTimeCompare([]byte(provided), []byte(apiKey)) != 1 {
				logger.Warn(r.Context(), "invalid API key")
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid API key"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
