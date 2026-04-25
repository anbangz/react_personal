package pipeline

import (
	"context"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/codepipeline"
	codepipelinetypes "github.com/aws/aws-sdk-go-v2/service/codepipeline/types"
)

type CodePipelineAPI interface {
	GetPipelineState(ctx context.Context, params *codepipeline.GetPipelineStateInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error)
	ListPipelineExecutions(ctx context.Context, params *codepipeline.ListPipelineExecutionsInput, optFns ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error)
}

type Client struct {
	api CodePipelineAPI
}

func NewClient(api CodePipelineAPI) *Client {
	return &Client{api: api}
}

func (c *Client) Report(ctx context.Context, logicalName, pipelineName string) Report {
	report := Report{
		LogicalName:  logicalName,
		PipelineName: pipelineName,
		Status:       StatusUnknown,
	}

	stateOutput, err := c.api.GetPipelineState(ctx, &codepipeline.GetPipelineStateInput{
		Name: aws.String(pipelineName),
	})
	if err != nil {
		report.Status = StatusError
		report.Detail = err.Error()
		return report
	}

	executionsOutput, err := c.api.ListPipelineExecutions(ctx, &codepipeline.ListPipelineExecutionsInput{
		PipelineName: aws.String(pipelineName),
		MaxResults:   aws.Int32(1),
	})
	if err != nil {
		report.Status = StatusError
		report.Detail = err.Error()
		return report
	}

	report.CurrentStage, report.Stages, report.Detail = normalizeStageStates(stateOutput.StageStates)
	report.Status = deriveStatusFromStages(report.Stages)

	if len(executionsOutput.PipelineExecutionSummaries) == 0 {
		if report.Detail == "" {
			report.Detail = "no recent executions"
		}
		return report
	}

	latest := executionsOutput.PipelineExecutionSummaries[0]
	report.Status = normalizePipelineStatus(latest.Status)
	report.StartedAt = aws.ToTime(latest.StartTime)
	report.UpdatedAt = aws.ToTime(latest.LastUpdateTime)
	if report.UpdatedAt.IsZero() {
		report.UpdatedAt = report.StartedAt
	}

	if summary := strings.TrimSpace(aws.ToString(latest.StatusSummary)); summary != "" {
		report.Detail = summary
	}

	if report.Detail == "" {
		if active := activeStage(report.Stages); active != nil {
			report.Detail = active.Detail
		}
	}

	return report
}

func normalizeStageStates(stageStates []codepipelinetypes.StageState) (string, []StageReport, string) {
	reports := make([]StageReport, 0, len(stageStates))
	for _, stageState := range stageStates {
		reports = append(reports, StageReport{
			Name:      aws.ToString(stageState.StageName),
			Status:    normalizeStageStatus(stageState.LatestExecution),
			UpdatedAt: stageUpdatedAt(stageState),
			Detail:    stageDetail(stageState),
		})
	}

	if active := activeStage(reports); active != nil {
		return active.Name, reports, active.Detail
	}

	for i := len(reports) - 1; i >= 0; i-- {
		if reports[i].Status == StatusFailed {
			return reports[i].Name, reports, reports[i].Detail
		}
	}

	if len(reports) == 0 {
		return "", reports, ""
	}

	last := reports[len(reports)-1]
	return last.Name, reports, last.Detail
}

func deriveStatusFromStages(stages []StageReport) Status {
	if active := activeStage(stages); active != nil {
		return StatusInProgress
	}

	for i := len(stages) - 1; i >= 0; i-- {
		if stages[i].Status == StatusFailed {
			return StatusFailed
		}
	}

	if len(stages) == 0 {
		return StatusIdle
	}

	return stages[len(stages)-1].Status
}

func activeStage(stages []StageReport) *StageReport {
	for i := range stages {
		if stages[i].Status == StatusInProgress {
			return &stages[i]
		}
	}

	return nil
}

func normalizePipelineStatus(status codepipelinetypes.PipelineExecutionStatus) Status {
	return normalizeStatusText(string(status))
}

func normalizeStageStatus(execution *codepipelinetypes.StageExecution) Status {
	if execution == nil {
		return StatusIdle
	}

	return normalizeStatusText(string(execution.Status))
}

func normalizeStatusText(status string) Status {
	switch status {
	case "InProgress", "Stopping":
		return StatusInProgress
	case "Succeeded":
		return StatusSucceeded
	case "Failed", "Stopped", "Superseded", "Cancelled", "Abandoned":
		return StatusFailed
	case "":
		return StatusIdle
	default:
		return StatusUnknown
	}
}

func stageUpdatedAt(stageState codepipelinetypes.StageState) time.Time {
	var updated time.Time
	for _, actionState := range stageState.ActionStates {
		if actionState.LatestExecution == nil {
			continue
		}

		changedAt := aws.ToTime(actionState.LatestExecution.LastStatusChange)
		if changedAt.After(updated) {
			updated = changedAt
		}
	}

	return updated
}

func stageDetail(stageState codepipelinetypes.StageState) string {
	for _, actionState := range stageState.ActionStates {
		if actionState.LatestExecution == nil {
			continue
		}

		if message := strings.TrimSpace(aws.ToString(actionState.LatestExecution.Summary)); message != "" {
			return message
		}

		if actionState.LatestExecution.ErrorDetails != nil {
			if message := strings.TrimSpace(aws.ToString(actionState.LatestExecution.ErrorDetails.Message)); message != "" {
				return message
			}
		}
	}

	return ""
}
