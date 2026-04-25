package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/anbangz/react_personal/backend/internal/logger"
)

// RecoveryLogger recovers from panics, logs the error with stack trace, and returns 500.
func RecoveryLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				logger.Error(r.Context(), "panic recovered", fmt.Errorf("%v", rec),
					"stack", string(debug.Stack()),
				)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
