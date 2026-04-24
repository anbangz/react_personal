package middleware

import (
	"net/http"
	"time"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

type responseRecorder struct {
	http.ResponseWriter
	status  int
	written bool
}

func (rr *responseRecorder) WriteHeader(code int) {
	if rr.written {
		return
	}
	rr.status = code
	rr.written = true
	rr.ResponseWriter.WriteHeader(code)
}

func (rr *responseRecorder) Write(b []byte) (int, error) {
	if !rr.written {
		rr.status = http.StatusOK
		rr.written = true
	}
	return rr.ResponseWriter.Write(b)
}

func (rr *responseRecorder) Flush() {
	if f, ok := rr.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// StructuredLogger logs one structured JSON line per HTTP request.
func StructuredLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rr := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rr, r)
		duration := time.Since(start)

		logger.Info(r.Context(), "request completed",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rr.status,
			"duration_ms", duration.Milliseconds(),
			"user_agent", r.UserAgent(),
			"remote_addr", r.RemoteAddr,
		)
	})
}
