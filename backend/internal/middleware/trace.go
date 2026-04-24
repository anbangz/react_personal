package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

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
	for i := 0; i < 3; i++ {
		n, err := rand.Read(b)
		if err == nil && n == len(b) {
			return hex.EncodeToString(b)
		}
	}
	// Fallback to timestamp-based hex if RNG fails repeatedly.
	return fmt.Sprintf("%016x", time.Now().UnixNano())
}
