package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Photo struct {
	Src     string `bson:"src" json:"src"`
	Caption string `bson:"caption,omitempty" json:"caption,omitempty"`
	Order   int    `bson:"order" json:"order"`
}

type Post struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Slug      string             `bson:"slug" json:"slug"`
	Title     string             `bson:"title" json:"title"`
	Summary   string             `bson:"summary,omitempty" json:"summary,omitempty"`
	Content   string             `bson:"content" json:"content"`
	Photos    []Photo            `bson:"photos,omitempty" json:"photos"`
	Published bool               `bson:"published" json:"published"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// CreatePostRequest is the JSON body for POST /admin/posts.
type CreatePostRequest struct {
	Slug      string  `json:"slug"`
	Title     string  `json:"title"`
	Summary   string  `json:"summary,omitempty"`
	Content   string  `json:"content"`
	Photos    []Photo `json:"photos,omitempty"`
	Published bool    `json:"published"`
}

// UpdatePostRequest is the JSON body for PUT /admin/posts/{slug}.
// All fields are pointers to support partial updates.
type UpdatePostRequest struct {
	Title     *string  `json:"title,omitempty"`
	Summary   *string  `json:"summary,omitempty"`
	Content   *string  `json:"content,omitempty"`
	Photos    *[]Photo `json:"photos,omitempty"`
	Published *bool    `json:"published,omitempty"`
}

// PaginatedResponse wraps a list response with pagination metadata.
type PaginatedResponse struct {
	Posts []Post `json:"posts"`
	Total int64  `json:"total"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
}

// PhotoListItem represents a photo in the S3 listing.
type PhotoListItem struct {
	Key          string    `json:"key"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"lastModified"`
}

// ErrorResponse is a standard JSON error body.
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}
