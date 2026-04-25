package logger

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
)

var errTest = errors.New("test error")

func TestWithTraceID(t *testing.T) {
	ctx := WithTraceID(context.Background(), "abc123")
	if got := TraceIDFromContext(ctx); got != "abc123" {
		t.Fatalf("expected trace_id abc123, got %s", got)
	}
}

func TestTraceIDFromContext_Missing(t *testing.T) {
	if got := TraceIDFromContext(context.Background()); got != "" {
		t.Fatalf("expected empty trace_id, got %s", got)
	}
}

func TestInfo_IncludesTraceID(t *testing.T) {
	old := defaultLogger
	defer func() { defaultLogger = old }()

	var buf bytes.Buffer
	handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	defaultLogger = slog.New(handler)

	ctx := WithTraceID(context.Background(), "trace-42")
	Info(ctx, "hello", "key", "val")

	line := buf.String()
	if !strings.Contains(line, `"trace_id":"trace-42"`) {
		t.Fatalf("expected trace_id in log line, got: %s", line)
	}
	if !strings.Contains(line, `"msg":"hello"`) {
		t.Fatalf("expected msg in log line, got: %s", line)
	}
}

func TestWarn_IncludesTraceID(t *testing.T) {
	old := defaultLogger
	defer func() { defaultLogger = old }()

	var buf bytes.Buffer
	handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	defaultLogger = slog.New(handler)

	ctx := WithTraceID(context.Background(), "trace-warn")
	Warn(ctx, "careful", "limit", 99)

	line := buf.String()
	if !strings.Contains(line, `"level":"WARN"`) {
		t.Fatalf("expected WARN level, got: %s", line)
	}
	if !strings.Contains(line, `"trace_id":"trace-warn"`) {
		t.Fatalf("expected trace_id, got: %s", line)
	}
}

func TestError_IncludesError(t *testing.T) {
	old := defaultLogger
	defer func() { defaultLogger = old }()

	var buf bytes.Buffer
	handler := slog.NewJSONHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	defaultLogger = slog.New(handler)

	ctx := WithTraceID(context.Background(), "trace-99")
	Error(ctx, "something failed", errTest, "op", "upload")

	line := buf.String()
	if !strings.Contains(line, `"error":"test error"`) {
		t.Fatalf("expected error in log line, got: %s", line)
	}
	if !strings.Contains(line, `"trace_id":"trace-99"`) {
		t.Fatalf("expected trace_id, got: %s", line)
	}
}
