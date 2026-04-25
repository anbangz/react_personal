package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

func TestRecoveryLogger_RecoversPanic(t *testing.T) {
	var buf bytes.Buffer
	logger.Init(&buf)
	defer logger.Init(io.Discard)

	handler := RecoveryLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something bad")
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Internal Server Error") {
		t.Fatalf("expected internal server error body, got: %s", body)
	}

	logOutput := buf.String()
	if !strings.Contains(logOutput, `"msg":"panic recovered"`) {
		t.Fatalf("expected log to contain panic recovered msg, got: %s", logOutput)
	}
	if !strings.Contains(logOutput, `"error":"something bad"`) {
		t.Fatalf("expected log to contain error something bad, got: %s", logOutput)
	}
	if !strings.Contains(logOutput, `"stack"`) {
		t.Fatalf("expected log to contain stack, got: %s", logOutput)
	}
}

func TestRecoveryLogger_HappyPath(t *testing.T) {
	handler := RecoveryLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "ok") {
		t.Fatalf("expected body to contain ok, got: %s", body)
	}
}
