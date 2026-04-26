package service

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	codepipeline "github.com/aws/aws-sdk-go-v2/service/codepipeline"
	codepipelinetypes "github.com/aws/aws-sdk-go-v2/service/codepipeline/types"
)

type statusSnapshotFetcher interface {
	FetchStatusSnapshot(ctx context.Context, now time.Time) (model.StatusSnapshot, error)
}

type StatusService struct {
	fetcher statusSnapshotFetcher
	ttl     time.Duration
	now     func() time.Time

	mu     sync.Mutex
	cached *model.StatusSnapshot
}

func NewStatusService(fetcher statusSnapshotFetcher, ttl time.Duration, now func() time.Time) *StatusService {
	if now == nil {
		now = time.Now
	}
	return &StatusService{fetcher: fetcher, ttl: ttl, now: now}
}

func (s *StatusService) GetSnapshot(ctx context.Context) (model.StatusSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := s.now()
	if s.cached != nil && now.Before(s.cached.StaleAfter) {
		return *s.cached, nil
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	snapshot, err := s.fetcher.FetchStatusSnapshot(fetchCtx, now)
	if err != nil {
		if s.cached != nil {
			stale := *s.cached
			stale.IsStale = true
			return stale, nil
		}
		return model.StatusSnapshot{}, fmt.Errorf("refresh status snapshot: %w", err)
	}

	snapshot.GeneratedAt = now
	snapshot.StaleAfter = now.Add(s.ttl)
	snapshot.IsStale = false
	s.cached = &snapshot
	return snapshot, nil
}

type stageDefinition struct {
	Key     string
	AWSName string
	Label   string
}

func frontendStageDefinitions() []stageDefinition {
	return []stageDefinition{
		{Key: "source", AWSName: "Source", Label: "Fetch Code"},
		{Key: "build", AWSName: "Build", Label: "Build Site"},
		{Key: "deploy-dev", AWSName: "DeployDev", Label: "Deploy to Dev"},
		{Key: "invalidate-dev", AWSName: "InvalidateDevCache", Label: "Clear Dev Cache"},
		{Key: "deploy-prod", AWSName: "DeployProd", Label: "Ship to Production"},
		{Key: "live", AWSName: "InvalidateProdCache", Label: "Production is Live"},
	}
}

func backendStageDefinitions() []stageDefinition {
	return []stageDefinition{
		{Key: "source", AWSName: "Source", Label: "Fetch Code"},
		{Key: "build", AWSName: "Build", Label: "Build API"},
		{Key: "deploy-dev", AWSName: "DeployDev", Label: "Deploy to Dev"},
		{Key: "deploy-prod", AWSName: "DeployProd", Label: "Ship to Production"},
		{Key: "live", AWSName: "DeployProd", Label: "Production is Live"},
	}
}

func terraformStageDefinitions() []stageDefinition {
	return []stageDefinition{
		{Key: "source", AWSName: "Source", Label: "Fetch Code"},
		{Key: "plan", AWSName: "Plan", Label: "Preview Changes"},
		{Key: "apply", AWSName: "Apply", Label: "Apply Changes"},
		{Key: "live", AWSName: "Apply", Label: "Infrastructure is Live"},
	}
}

func normalizeStageStates(defs []stageDefinition, activeAWSStage string, executionStatus string) []model.StatusStage {
	stages := make([]model.StatusStage, 0, len(defs))
	seenActive := false
	for _, def := range defs {
		state := model.StatusStageStatePending
		switch {
		case executionStatus == "Succeeded":
			state = model.StatusStageStateCompleted
		case executionStatus == "Failed" && def.AWSName == activeAWSStage:
			state = model.StatusStageStateFailed
			seenActive = true
		case executionStatus == "InProgress" && def.AWSName == activeAWSStage:
			state = model.StatusStageStateActive
			seenActive = true
		case !seenActive:
			state = model.StatusStageStateCompleted
		}
		stages = append(stages, model.StatusStage{Key: def.Key, Label: def.Label, State: state})
	}
	return stages
}

func buildCalendarMonth(year int, month time.Month, counts map[string]int) model.CalendarMonth {
	firstDay := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	nextMonth := firstDay.AddDate(0, 1, 0)
	daysInMonth := int(nextMonth.Add(-24 * time.Hour).Day())
	leading := int(firstDay.Weekday())
	trailing := (7 - ((leading + daysInMonth) % 7)) % 7

	days := make([]model.CalendarDay, 0, daysInMonth)
	for day := 1; day <= daysInMonth; day++ {
		date := time.Date(year, month, day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		days = append(days, model.CalendarDay{Date: date, DeployedCommitCount: counts[date]})
	}

	return model.CalendarMonth{
		Year:              year,
		Month:             int(month),
		Label:             firstDay.Format("January 2006"),
		LeadingBlankDays:  leading,
		TrailingBlankDays: trailing,
		Days:              days,
	}
}

func buildRollingCalendar(now time.Time, counts map[string]int) model.CalendarSnapshot {
	months := make([]model.CalendarMonth, 0, 12)
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -11, 0)
	for i := 0; i < 12; i++ {
		month := start.AddDate(0, i, 0)
		months = append(months, buildCalendarMonth(month.Year(), month.Month(), counts))
	}
	return model.CalendarSnapshot{Months: months}
}

func sortActivity(items []model.ActivityItem) []model.ActivityItem {
	sort.Slice(items, func(i, j int) bool {
		return items[i].Timestamp.After(items[j].Timestamp)
	})
	if len(items) > 8 {
		return items[:8]
	}
	return items
}

type codePipelineAPI interface {
	GetPipelineState(ctx context.Context, params *codepipeline.GetPipelineStateInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error)
	ListPipelineExecutions(ctx context.Context, params *codepipeline.ListPipelineExecutionsInput, optFns ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error)
	GetPipelineExecution(ctx context.Context, params *codepipeline.GetPipelineExecutionInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineExecutionOutput, error)
}

type codePipelineStatusFetcher struct {
	client codePipelineAPI
}

func NewCodePipelineStatusFetcher(client codePipelineAPI) statusSnapshotFetcher {
	return &codePipelineStatusFetcher{client: client}
}

func (f *codePipelineStatusFetcher) FetchStatusSnapshot(ctx context.Context, now time.Time) (model.StatusSnapshot, error) {
	pipelines := []struct {
		key         string
		name        string
		label       string
		description string
		defs        []stageDefinition
	}{
		{key: "frontend", name: "PersonalWebsitePipeline", label: "Personal Website", description: "Builds the React site and ships it through dev and production.", defs: frontendStageDefinitions()},
		{key: "backend", name: "BackendAPIPipeline", label: "Backend API", description: "Compiles the Go API and pushes it to the Lambda environments.", defs: backendStageDefinitions()},
		{key: "terraform", name: "TerraformInfrastructurePipeline", label: "Terraform Infrastructure", description: "Previews and applies Terraform changes for site infrastructure.", defs: terraformStageDefinitions()},
	}

	counts := make(map[string]int)
	activity := make([]model.ActivityItem, 0, 8)
	result := make([]model.PipelineSnapshot, 0, len(pipelines))

	for _, pipeline := range pipelines {
		snapshot, items, dayCounts, err := f.buildPipelineSnapshot(ctx, pipeline.key, pipeline.name, pipeline.label, pipeline.description, pipeline.defs)
		if err != nil {
			return model.StatusSnapshot{}, err
		}
		result = append(result, snapshot)
		activity = append(activity, items...)
		for day, count := range dayCounts {
			counts[day] += count
		}
	}

	return model.StatusSnapshot{
		Pipelines:      result,
		Calendar:       buildRollingCalendar(now, counts),
		RecentActivity: sortActivity(activity),
	}, nil
}

func (f *codePipelineStatusFetcher) buildPipelineSnapshot(ctx context.Context, key string, pipelineName string, label string, description string, defs []stageDefinition) (model.PipelineSnapshot, []model.ActivityItem, map[string]int, error) {
	stateOut, err := f.client.GetPipelineState(ctx, &codepipeline.GetPipelineStateInput{Name: aws.String(pipelineName)})
	if err != nil {
		return model.PipelineSnapshot{}, nil, nil, fmt.Errorf("get pipeline state for %s: %w", pipelineName, err)
	}

	activeStageName := ""
	executionState := "Succeeded"
	var lastStarted *time.Time
	var lastFinished *time.Time

	for _, stage := range stateOut.StageStates {
		if stage.LatestExecution == nil || stage.StageName == nil {
			continue
		}
		status := string(stage.LatestExecution.Status)
		var timestamp time.Time
		for _, action := range stage.ActionStates {
			if action.LatestExecution != nil && action.LatestExecution.LastStatusChange != nil {
				t := aws.ToTime(action.LatestExecution.LastStatusChange)
				if t.After(timestamp) {
					timestamp = t
				}
			}
		}
		switch status {
		case "InProgress":
			activeStageName = aws.ToString(stage.StageName)
			executionState = "InProgress"
			lastStarted = &timestamp
		case "Failed":
			if executionState != "InProgress" {
				activeStageName = aws.ToString(stage.StageName)
				executionState = "Failed"
				if lastFinished == nil || timestamp.After(*lastFinished) {
					lastFinished = &timestamp
				}
			}
		case "Succeeded":
			if lastFinished == nil || timestamp.After(*lastFinished) {
				lastFinished = &timestamp
			}
		}
	}

	var activeStageKey *string
	for _, def := range defs {
		if def.AWSName == activeStageName {
			activeStageKey = &def.Key
			break
		}
	}

	listOut, err := f.client.ListPipelineExecutions(ctx, &codepipeline.ListPipelineExecutionsInput{
		PipelineName: aws.String(pipelineName),
		MaxResults:   aws.Int32(12),
	})
	if err != nil {
		return model.PipelineSnapshot{}, nil, nil, fmt.Errorf("list executions for %s: %w", pipelineName, err)
	}

	dayCounts := make(map[string]int)
	seenRevisions := make(map[string]struct{})
	activity := make([]model.ActivityItem, 0, 4)
	var lastCommit *model.DeployedCommit

	for _, summary := range listOut.PipelineExecutionSummaries {
		if summary.PipelineExecutionId == nil {
			continue
		}
		if summary.Status != codepipelinetypes.PipelineExecutionStatusSucceeded && summary.Status != codepipelinetypes.PipelineExecutionStatusFailed {
			continue
		}

		details, err := f.client.GetPipelineExecution(ctx, &codepipeline.GetPipelineExecutionInput{
			PipelineName:        aws.String(pipelineName),
			PipelineExecutionId: summary.PipelineExecutionId,
		})
		if err != nil {
			return model.PipelineSnapshot{}, nil, nil, fmt.Errorf("get execution details for %s: %w", pipelineName, err)
		}

		finishedAt := aws.ToTime(summary.LastUpdateTime)
		if lastFinished == nil {
			lastFinished = &finishedAt
		}

		if len(details.PipelineExecution.ArtifactRevisions) == 0 {
			continue
		}

		revision := details.PipelineExecution.ArtifactRevisions[0]
		sha := aws.ToString(revision.RevisionId)
		message := aws.ToString(revision.RevisionSummary)
		dateKey := finishedAt.UTC().Format("2006-01-02")
		dedupKey := pipelineName + "|" + sha + "|" + dateKey

		if summary.Status == codepipelinetypes.PipelineExecutionStatusSucceeded {
			if _, exists := seenRevisions[dedupKey]; !exists {
				seenRevisions[dedupKey] = struct{}{}
				dayCounts[dateKey]++
			}
			if lastCommit == nil {
				lastCommit = &model.DeployedCommit{SHA: sha, Message: message}
			}
			activity = append(activity, model.ActivityItem{
				Timestamp: finishedAt,
				Message:   fmt.Sprintf("%s shipped %s to production", label, shortSHA(sha)),
			})
		} else {
			activity = append(activity, model.ActivityItem{
				Timestamp: finishedAt,
				Message:   fmt.Sprintf("%s failed during %s for %s", label, statusMessageForStage(activeStageName, defs), shortSHA(sha)),
			})
		}
	}

	stages := normalizeStageStates(defs, activeStageName, executionState)
	status := pipelineStatusFromExecution(executionState)
	statusMessage := statusMessageForPipeline(status, stages)

	return model.PipelineSnapshot{
		Key:                     key,
		Label:                   label,
		Description:             description,
		Status:                  status,
		StatusMessage:           statusMessage,
		Stages:                  stages,
		ActiveStageKey:          activeStageKey,
		LastExecutionStartedAt:  lastStarted,
		LastExecutionFinishedAt: lastFinished,
		LastDeployedCommit:      lastCommit,
	}, activity, dayCounts, nil
}

func pipelineStatusFromExecution(state string) model.PipelineStatus {
	switch state {
	case "InProgress":
		return model.PipelineStatusRunning
	case "Failed":
		return model.PipelineStatusFailed
	case "Succeeded":
		return model.PipelineStatusSucceeded
	default:
		return model.PipelineStatusUnknown
	}
}

func statusMessageForPipeline(status model.PipelineStatus, stages []model.StatusStage) string {
	for _, stage := range stages {
		if stage.State == model.StatusStageStateActive {
			return "Current step: " + stage.Label
		}
		if stage.State == model.StatusStageStateFailed {
			return "Failed at: " + stage.Label
		}
	}
	if status == model.PipelineStatusSucceeded && len(stages) > 0 {
		return "Current step: " + stages[len(stages)-1].Label
	}
	return "Pipeline status unavailable"
}

func statusMessageForStage(activeAWSStage string, defs []stageDefinition) string {
	for _, def := range defs {
		if def.AWSName == activeAWSStage {
			return def.Label
		}
	}
	return activeAWSStage
}

func shortSHA(value string) string {
	if len(value) > 7 {
		return value[:7]
	}
	return value
}
