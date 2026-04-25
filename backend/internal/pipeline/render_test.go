package pipeline

import (
	"strings"
	"testing"
	"time"
)

func TestRenderReports_Summary(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	reports := []Report{{
		LogicalName:  "website",
		PipelineName: "PersonalWebsitePipeline",
		Status:       StatusInProgress,
		CurrentStage: "InvalidateProdCache",
		UpdatedAt:    now.Add(-2 * time.Minute),
		Detail:       "waiting on CodeBuild",
	}}

	got := RenderReports(reports, false, now)

	for _, want := range []string{
		"PIPELINE",
		"STATUS",
		"STAGE",
		"UPDATED",
		"DETAILS",
		"website",
		"InProgress",
		"InvalidateProdCache",
		"2m ago",
		"waiting on CodeBuild",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("expected output to contain %q, got:\n%s", want, got)
		}
	}
}

func TestRenderReports_Verbose(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	reports := []Report{{
		LogicalName:  "backend",
		PipelineName: "BackendAPIPipeline",
		Status:       StatusSucceeded,
		CurrentStage: "DeployProd",
		UpdatedAt:    now.Add(-6 * time.Minute),
		Detail:       "deployed successfully",
		Stages: []StageReport{
			{Name: "Build", Status: StatusSucceeded, UpdatedAt: now.Add(-8 * time.Minute), Detail: "build complete"},
			{Name: "DeployDev", Status: StatusSucceeded, UpdatedAt: now.Add(-7 * time.Minute), Detail: "dev deployed"},
			{Name: "DeployProd", Status: StatusSucceeded, UpdatedAt: now.Add(-6 * time.Minute), Detail: "prod deployed"},
		},
	}}

	got := RenderReports(reports, true, now)

	for _, want := range []string{
		"backend",
		"Succeeded",
		"backend (BackendAPIPipeline)",
		"Build",
		"DeployDev",
		"DeployProd",
		"prod deployed",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("expected verbose output to contain %q, got:\n%s", want, got)
		}
	}
}
