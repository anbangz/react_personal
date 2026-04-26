package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	codepipeline "github.com/aws/aws-sdk-go-v2/service/codepipeline"
	codepipelinetypes "github.com/aws/aws-sdk-go-v2/service/codepipeline/types"
)

type fakePipelineClient struct {
	snapshot model.StatusSnapshot
	err      error
	calls    int
}

func (f *fakePipelineClient) FetchStatusSnapshot(ctx context.Context, now time.Time) (model.StatusSnapshot, error) {
	f.calls++
	if f.err != nil {
		return model.StatusSnapshot{}, f.err
	}
	return f.snapshot, nil
}

func TestStatusService_UsesFreshCache(t *testing.T) {
	now := time.Date(2026, 4, 25, 18, 10, 0, 0, time.UTC)
	client := &fakePipelineClient{snapshot: model.StatusSnapshot{GeneratedAt: now, StaleAfter: now.Add(time.Minute)}}
	svc := NewStatusService(client, time.Minute, func() time.Time { return now })

	_, err := svc.GetSnapshot(context.Background())
	if err != nil {
		t.Fatalf("unexpected first fetch error: %v", err)
	}
	_, err = svc.GetSnapshot(context.Background())
	if err != nil {
		t.Fatalf("unexpected second fetch error: %v", err)
	}
	if client.calls != 1 {
		t.Fatalf("expected one upstream call, got %d", client.calls)
	}
}

func TestStatusService_ReturnsStaleSnapshotWhenRefreshFails(t *testing.T) {
	now := time.Date(2026, 4, 25, 18, 10, 0, 0, time.UTC)
	client := &fakePipelineClient{snapshot: model.StatusSnapshot{GeneratedAt: now, StaleAfter: now.Add(time.Minute)}}

	call := 0
	clock := func() time.Time {
		call++
		if call == 1 {
			return now
		}
		return now.Add(2 * time.Minute) // past TTL, cache is stale
	}

	svc := NewStatusService(client, time.Minute, clock)

	_, err := svc.GetSnapshot(context.Background())
	if err != nil {
		t.Fatalf("unexpected first fetch error: %v", err)
	}
	client.err = errors.New("aws unavailable")

	snapshot, err := svc.GetSnapshot(context.Background())
	if err != nil {
		t.Fatalf("expected stale snapshot, got error: %v", err)
	}
	if !snapshot.IsStale {
		t.Fatal("expected stale snapshot flag to be true")
	}
}

func TestStatusService_ReturnsErrorWhenNoCacheAndRefreshFails(t *testing.T) {
	now := time.Date(2026, 4, 25, 18, 10, 0, 0, time.UTC)
	client := &fakePipelineClient{err: errors.New("aws unavailable")}
	svc := NewStatusService(client, time.Minute, func() time.Time { return now })

	_, err := svc.GetSnapshot(context.Background())
	if err == nil {
		t.Fatal("expected error when no cache and refresh fails")
	}
}

func TestBuildCalendarMonth_PadsLeadingAndTrailingDays(t *testing.T) {
	counts := map[string]int{
		"2026-04-01": 1,
		"2026-04-25": 2,
	}
	month := buildCalendarMonth(2026, time.April, counts)
	if month.Label != "April 2026" {
		t.Fatalf("expected label April 2026, got %q", month.Label)
	}
	if month.LeadingBlankDays < 0 || month.TrailingBlankDays < 0 {
		t.Fatal("expected non-negative blank day padding")
	}
	if len(month.Days) != 30 {
		t.Fatalf("expected 30 days in April, got %d", len(month.Days))
	}
	if month.Days[24].DeployedCommitCount != 2 {
		t.Fatalf("expected Apr 25 to count 2, got %d", month.Days[24].DeployedCommitCount)
	}
	if month.LeadingBlankDays != 3 {
		t.Fatalf("expected 3 leading blank days, got %d", month.LeadingBlankDays)
	}
	if month.TrailingBlankDays != 2 {
		t.Fatalf("expected 2 trailing blank days, got %d", month.TrailingBlankDays)
	}
}

func TestNormalizeStages_MapsRunningAndFailedStates(t *testing.T) {
	running := normalizeStageStates(frontendStageDefinitions(), "DeployProd", "InProgress")
	if len(running) < 5 {
		t.Fatalf("expected at least 5 stages, got %d", len(running))
	}
	if running[4].State != model.StatusStageStateActive {
		t.Fatalf("expected Ship to Production to be active, got %s", running[4].State)
	}

	failed := normalizeStageStates(terraformStageDefinitions(), "Apply", "Failed")
	if len(failed) < 3 {
		t.Fatalf("expected at least 3 stages, got %d", len(failed))
	}
	if failed[2].State != model.StatusStageStateFailed {
		t.Fatalf("expected Apply Changes to be failed, got %s", failed[2].State)
	}
}

func TestBuildRollingCalendar_ReturnsTwelveMonths(t *testing.T) {
	now := time.Date(2026, 4, 25, 18, 10, 0, 0, time.UTC)
	calendar := buildRollingCalendar(now, map[string]int{"2026-04-25": 2})
	if len(calendar.Months) != 12 {
		t.Fatalf("expected 12 months, got %d", len(calendar.Months))
	}
	last := calendar.Months[len(calendar.Months)-1]
	if last.Label != "April 2026" {
		t.Fatalf("expected latest month April 2026, got %q", last.Label)
	}
}

type fakeCodePipelineAPI struct {
	getPipelineState       func(ctx context.Context, params *codepipeline.GetPipelineStateInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error)
	listPipelineExecutions func(ctx context.Context, params *codepipeline.ListPipelineExecutionsInput, optFns ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error)
	getPipelineExecution   func(ctx context.Context, params *codepipeline.GetPipelineExecutionInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineExecutionOutput, error)
}

func (f *fakeCodePipelineAPI) GetPipelineState(ctx context.Context, params *codepipeline.GetPipelineStateInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error) {
	return f.getPipelineState(ctx, params, optFns...)
}

func (f *fakeCodePipelineAPI) ListPipelineExecutions(ctx context.Context, params *codepipeline.ListPipelineExecutionsInput, optFns ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error) {
	return f.listPipelineExecutions(ctx, params, optFns...)
}

func (f *fakeCodePipelineAPI) GetPipelineExecution(ctx context.Context, params *codepipeline.GetPipelineExecutionInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineExecutionOutput, error) {
	return f.getPipelineExecution(ctx, params, optFns...)
}

func TestBuildPipelineSnapshot_RecentActivityOnlyIncludesSuccessfulDeployments(t *testing.T) {
	now := time.Date(2026, 4, 25, 18, 10, 0, 0, time.UTC)
	successTime := now.Add(-1 * time.Hour)
	failTime := now.Add(-2 * time.Hour)

	fake := &fakeCodePipelineAPI{
		getPipelineState: func(_ context.Context, _ *codepipeline.GetPipelineStateInput, _ ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error) {
			return &codepipeline.GetPipelineStateOutput{
				StageStates: []codepipelinetypes.StageState{
					{
						StageName: aws.String("Source"),
						LatestExecution: &codepipelinetypes.StageExecution{
							Status: codepipelinetypes.StageExecutionStatusSucceeded,
						},
						ActionStates: []codepipelinetypes.ActionState{
							{
								LatestExecution: &codepipelinetypes.ActionExecution{
									LastStatusChange: aws.Time(successTime),
								},
							},
						},
					},
				},
			}, nil
		},
		listPipelineExecutions: func(_ context.Context, _ *codepipeline.ListPipelineExecutionsInput, _ ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error) {
			return &codepipeline.ListPipelineExecutionsOutput{
				PipelineExecutionSummaries: []codepipelinetypes.PipelineExecutionSummary{
					{
						PipelineExecutionId: aws.String("exec-success"),
						Status:              codepipelinetypes.PipelineExecutionStatusSucceeded,
						LastUpdateTime:      aws.Time(successTime),
					},
					{
						PipelineExecutionId: aws.String("exec-fail"),
						Status:              codepipelinetypes.PipelineExecutionStatusFailed,
						LastUpdateTime:      aws.Time(failTime),
					},
				},
			}, nil
		},
		getPipelineExecution: func(_ context.Context, params *codepipeline.GetPipelineExecutionInput, _ ...func(*codepipeline.Options)) (*codepipeline.GetPipelineExecutionOutput, error) {
			sha := "abc1234"
			msg := "test commit"
			if aws.ToString(params.PipelineExecutionId) == "exec-fail" {
				sha = "deadbeef"
				msg = "failed commit"
			}
			return &codepipeline.GetPipelineExecutionOutput{
				PipelineExecution: &codepipelinetypes.PipelineExecution{
					ArtifactRevisions: []codepipelinetypes.ArtifactRevision{
						{
							RevisionId:      aws.String(sha),
							RevisionSummary: aws.String(msg),
						},
					},
				},
			}, nil
		},
	}

	fetcher := &codePipelineStatusFetcher{client: fake}
	_, activity, _, err := fetcher.buildPipelineSnapshot(context.Background(), "frontend", "PersonalWebsitePipeline", "Personal Website", "desc", frontendStageDefinitions())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(activity) != 1 {
		t.Fatalf("expected 1 activity item, got %d", len(activity))
	}

	for _, item := range activity {
		if !strings.Contains(item.Message, "shipped") {
			t.Fatalf("expected activity message to contain 'shipped', got %q", item.Message)
		}
		if strings.Contains(item.Message, "failed") {
			t.Fatalf("expected activity message not to contain 'failed', got %q", item.Message)
		}
	}
}
