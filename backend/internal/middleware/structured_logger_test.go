package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

func TestStructuredLogger_LogsRequest(t *testing.T) {
	var buf bytes.Buffer
	logger.Init(&buf)

	handler := StructuredLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest(http.MethodPost, "/posts", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	line := buf.String()
	if !strings.Contains(line, `"msg":"request completed"`) {
		t.Fatalf("expected request completed msg, got: %s", line)
	}
	if !strings.Contains(line, `"method":"POST"`) {
		t.Fatalf("expected method POST, got: %s", line)
	}
	if !strings.Contains(line, `"path":"/posts"`) {
		t.Fatalf("expected path /posts, got: %s", line)
	}
	if !strings.Contains(line, `"status":201`) {
		t.Fatalf("expected status 201, got: %s", line)
	}
	if !strings.Contains(line, `"duration_ms"`) {
		t.Fatalf("expected duration_ms, got: %s", line)
	}
}

func TestStructuredLogger_DefaultsTo200(t *testing.T) {
	var buf bytes.Buffer
	logger.Init(&buf)

	handler := StructuredLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	line := buf.String()
	if !strings.Contains(line, `"status":200`) {
		t.Fatalf("expected status 200 when only Write is called, got: %s", line)
	}
}
