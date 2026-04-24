package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

func TestTraceID_SetsTraceIDInContext(t *testing.T) {
	var captured string
	handler := TraceID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = logger.TraceIDFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if captured == "" {
		t.Fatal("expected trace_id to be set in context")
	}
	if len(captured) != 16 {
		t.Fatalf("expected 16-char hex trace_id, got %d chars: %s", len(captured), captured)
	}
}
