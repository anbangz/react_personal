package handler

import (
	"github.com/anbangz/react_personal/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/mongo"
)

// RouterConfig holds dependencies needed to build the router.
type RouterConfig struct {
	MongoClient   *mongo.Client
	PostHandler   *PostHandler
	PhotoHandler  *PhotoHandler
	StatusHandler *StatusHandler
	APIKey        string
	AllowedOrigin string
}

// NewRouter builds the chi router with all routes and middleware.
func NewRouter(cfg RouterConfig) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.TraceID)
	r.Use(middleware.StructuredLogger)
	r.Use(middleware.RecoveryLogger)
	r.Use(middleware.CORS(cfg.AllowedOrigin))

	// Health
	r.Get("/health", NewHealthHandler(cfg.MongoClient).ServeHTTP)

	// Public post endpoints
	r.Get("/posts", cfg.PostHandler.ListPublished)
	r.Get("/posts/{slug}", cfg.PostHandler.GetBySlug)

	// Public status endpoint
	r.Get("/status", cfg.StatusHandler.ServeHTTP)

	// Admin endpoints (API key required)
	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.APIKeyAuth(cfg.APIKey))

		r.Get("/posts", cfg.PostHandler.ListAll)
		r.Post("/posts", cfg.PostHandler.Create)
		r.Put("/posts/{slug}", cfg.PostHandler.Update)
		r.Delete("/posts/{slug}", cfg.PostHandler.Delete)

		r.Post("/photos", cfg.PhotoHandler.Upload)
		r.Get("/photos", cfg.PhotoHandler.List)
		r.Delete("/photos/*", cfg.PhotoHandler.Delete)
	})

	return r
}
