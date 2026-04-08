package service

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type mockS3Client struct {
	objects map[string][]byte
}

func newMockS3() *mockS3Client {
	return &mockS3Client{objects: make(map[string][]byte)}
}

func (m *mockS3Client) PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	data, _ := io.ReadAll(params.Body)
	m.objects[aws.ToString(params.Key)] = data
	return &s3.PutObjectOutput{}, nil
}

func (m *mockS3Client) DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error) {
	delete(m.objects, aws.ToString(params.Key))
	return &s3.DeleteObjectOutput{}, nil
}

func (m *mockS3Client) ListObjectsV2(ctx context.Context, params *s3.ListObjectsV2Input, optFns ...func(*s3.Options)) (*s3.ListObjectsV2Output, error) {
	var contents []s3types.Object
	for key, data := range m.objects {
		size := int64(len(data))
		contents = append(contents, s3types.Object{
			Key:  aws.String(key),
			Size: &size,
		})
	}
	return &s3.ListObjectsV2Output{Contents: contents}, nil
}

func TestPhotoService_Upload(t *testing.T) {
	mock := newMockS3()
	svc := NewPhotoService(mock, "test-bucket", "https://photos.example.com")

	url, err := svc.Upload(context.Background(), "photo.jpg", "image/jpeg", bytes.NewReader([]byte("fake-image")))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(url, "https://photos.example.com/") {
		t.Errorf("expected CDN URL prefix, got: %s", url)
	}
	if len(mock.objects) != 1 {
		t.Errorf("expected 1 object in mock, got %d", len(mock.objects))
	}
}

func TestPhotoService_List_Empty(t *testing.T) {
	mock := newMockS3()
	svc := NewPhotoService(mock, "test-bucket", "https://photos.example.com")

	items, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}
