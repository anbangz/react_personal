package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
)

type ctxKey string

const traceIDKey ctxKey = "trace_id"

var defaultLogger = slog.New(slog.NewJSONHandler(io.Discard, nil))

// Init initializes the default JSON logger.
func Init(w io.Writer) {
	level := slog.LevelInfo
	if lvl := os.Getenv("LOG_LEVEL"); lvl != "" {
		var l slog.Level
		if err := l.UnmarshalText([]byte(lvl)); err == nil {
			level = l
		}
	}

	addSource := isLocal()
	if v := os.Getenv("LOG_SOURCE"); v != "" {
		addSource = v == "true"
	}
	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: addSource,
	}

	handler := slog.NewJSONHandler(w, opts)
	defaultLogger = slog.New(handler)
	slog.SetDefault(defaultLogger)
}

// WithTraceID returns a new context with the given trace ID.
func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

// TraceIDFromContext extracts the trace ID from context.
func TraceIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(traceIDKey).(string); ok {
		return id
	}
	return ""
}

// Info logs an info message with trace_id from context.
func Info(ctx context.Context, msg string, args ...any) {
	args = appendTraceID(ctx, args)
	defaultLogger.Info(msg, args...)
}

// Warn logs a warning message with trace_id from context.
func Warn(ctx context.Context, msg string, args ...any) {
	args = appendTraceID(ctx, args)
	defaultLogger.Warn(msg, args...)
}

// Error logs an error message with trace_id from context.
func Error(ctx context.Context, msg string, err error, args ...any) {
	if err != nil {
		args = append(append([]any(nil), args...), "error", err.Error())
	}
	args = appendTraceID(ctx, args)
	defaultLogger.Error(msg, args...)
}

func appendTraceID(ctx context.Context, args []any) []any {
	if id := TraceIDFromContext(ctx); id != "" {
		return append([]any{"trace_id", id}, args...)
	}
	return args
}

// isLocal returns true when not running in AWS Lambda.
func isLocal() bool {
	return os.Getenv("AWS_LAMBDA_FUNCTION_NAME") == "" && os.Getenv("LAMBDA_TASK_ROOT") == ""
}
