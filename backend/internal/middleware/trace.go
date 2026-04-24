package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

// TraceID sets a unique 16-char hex trace ID in the request context.
func TraceID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := generateTraceID()
		ctx := logger.WithTraceID(r.Context(), traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func generateTraceID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}
