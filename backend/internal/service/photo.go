package service

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/anbangz/react_personal/backend/internal/logger"
	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3API is the subset of the S3 client interface we use (for testability).
type S3API interface {
	PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error)
	DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error)
	ListObjectsV2(ctx context.Context, params *s3.ListObjectsV2Input, optFns ...func(*s3.Options)) (*s3.ListObjectsV2Output, error)
}

// PhotoService handles S3 photo operations.
type PhotoService struct {
	s3Client S3API
	bucket   string
	cdnURL   string // e.g. "https://photos.anbangz.me"
}

// NewPhotoService creates a new PhotoService.
func NewPhotoService(s3Client S3API, bucket string, cdnURL string) *PhotoService {
	return &PhotoService{s3Client: s3Client, bucket: bucket, cdnURL: cdnURL}
}

// Upload stores a photo in S3 and returns the CDN URL.
func (s *PhotoService) Upload(ctx context.Context, key string, contentType string, body io.Reader) (string, error) {
	key = sanitizeKey(key)
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		logger.Error(ctx, "S3 upload failed", err, "key", key)
		return "", fmt.Errorf("upload to S3: %w", err)
	}
	return s.cdnURL + "/" + key, nil
}

// Delete removes a photo from S3.
func (s *PhotoService) Delete(ctx context.Context, key string) error {
	_, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		logger.Error(ctx, "S3 delete failed", err, "key", key)
		return fmt.Errorf("delete from S3: %w", err)
	}
	return nil
}

// List returns all photos in the S3 bucket.
func (s *PhotoService) List(ctx context.Context) ([]model.PhotoListItem, error) {
	var items []model.PhotoListItem
	paginator := s3.NewListObjectsV2Paginator(s.s3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
	})

	for paginator.HasMorePages() {
		output, err := paginator.NextPage(ctx)
		if err != nil {
			logger.Error(ctx, "S3 list failed", err)
			return nil, fmt.Errorf("list S3 objects: %w", err)
		}
		for _, obj := range output.Contents {
			items = append(items, model.PhotoListItem{
				Key:          aws.ToString(obj.Key),
				URL:          s.cdnURL + "/" + aws.ToString(obj.Key),
				Size:         aws.ToInt64(obj.Size),
				LastModified: aws.ToTime(obj.LastModified),
			})
		}
	}
	if items == nil {
		items = []model.PhotoListItem{}
	}
	return items, nil
}

// KeyFromURL extracts the S3 key from a CDN URL.
func (s *PhotoService) KeyFromURL(url string) string {
	return strings.TrimPrefix(url, s.cdnURL+"/")
}

func sanitizeKey(key string) string {
	ext := filepath.Ext(key)
	base := strings.TrimSuffix(filepath.Base(key), ext)
	base = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, base)
	return fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), base, ext)
}
