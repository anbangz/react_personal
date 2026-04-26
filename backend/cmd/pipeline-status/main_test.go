package main

import (
	"strings"
	"testing"
)

func TestResolvePipelineSelection_All(t *testing.T) {
	selected, err := resolvePipelineSelection("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(selected) != 3 {
		t.Fatalf("expected 3 pipelines, got %d", len(selected))
	}
	if selected[0].LogicalName != "website" {
		t.Fatalf("expected first logical name website, got %q", selected[0].LogicalName)
	}
	if selected[1].LogicalName != "backend" {
		t.Fatalf("expected second logical name backend, got %q", selected[1].LogicalName)
	}
	if selected[2].LogicalName != "terraform" {
		t.Fatalf("expected third logical name terraform, got %q", selected[2].LogicalName)
	}
}

func TestResolvePipelineSelection_Unknown(t *testing.T) {
	_, err := resolvePipelineSelection("mobile")
	if err == nil {
		t.Fatal("expected an error for unknown pipeline")
	}
	if !strings.Contains(err.Error(), "website, backend, terraform") {
		t.Fatalf("expected allowed-values error, got %v", err)
	}
}
