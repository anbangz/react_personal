package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
)

type fakeStatusService struct {
	snapshot model.StatusSnapshot
	err      error
}

func (f *fakeStatusService) GetSnapshot(ctx context.Context) (model.StatusSnapshot, error) {
	if f.err != nil {
		return model.StatusSnapshot{}, f.err
	}
	return f.snapshot, nil
}

func TestStatusHandler_ServeHTTP(t *testing.T) {
	h := NewStatusHandler(&fakeStatusService{snapshot: model.StatusSnapshot{GeneratedAt: time.Now(), StaleAfter: time.Now().Add(15 * time.Minute)}})
	req := httptest.NewRequest(http.MethodGet, "/status", nil)
	res := httptest.NewRecorder()

	h.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	var payload model.StatusSnapshot
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json: %v", err)
	}
}

func TestStatusHandler_ServeHTTP_RefreshFailure(t *testing.T) {
	h := NewStatusHandler(&fakeStatusService{err: errors.New("refresh status snapshot: aws unavailable")})
	req := httptest.NewRequest(http.MethodGet, "/status", nil)
	res := httptest.NewRecorder()

	h.ServeHTTP(res, req)

	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", res.Code)
	}
}
