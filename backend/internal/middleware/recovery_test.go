package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRecoveryLogger_RecoversPanic(t *testing.T) {
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
}
