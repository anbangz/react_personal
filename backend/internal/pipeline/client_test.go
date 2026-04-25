package pipeline

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/codepipeline"
	codepipelinetypes "github.com/aws/aws-sdk-go-v2/service/codepipeline/types"
)

type stubCodePipelineAPI struct {
	stateOutput *codepipeline.GetPipelineStateOutput
	stateErr    error
	execsOutput *codepipeline.ListPipelineExecutionsOutput
	execsErr    error
}

func (s *stubCodePipelineAPI) GetPipelineState(ctx context.Context, params *codepipeline.GetPipelineStateInput, optFns ...func(*codepipeline.Options)) (*codepipeline.GetPipelineStateOutput, error) {
	return s.stateOutput, s.stateErr
}

func (s *stubCodePipelineAPI) ListPipelineExecutions(ctx context.Context, params *codepipeline.ListPipelineExecutionsInput, optFns ...func(*codepipeline.Options)) (*codepipeline.ListPipelineExecutionsOutput, error) {
	return s.execsOutput, s.execsErr
}

func TestClientReport_Succeeded(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	client := NewClient(&stubCodePipelineAPI{
		stateOutput: &codepipeline.GetPipelineStateOutput{
			PipelineName: aws.String("BackendAPIPipeline"),
			StageStates: []codepipelinetypes.StageState{
				{
					StageName: aws.String("Build"),
					LatestExecution: &codepipelinetypes.StageExecution{
						PipelineExecutionId: aws.String("exec-1"),
						Status:              codepipelinetypes.StageExecutionStatus("Succeeded"),
					},
					ActionStates: []codepipelinetypes.ActionState{{
						ActionName: aws.String("Build"),
						LatestExecution: &codepipelinetypes.ActionExecution{
							Status:           codepipelinetypes.ActionExecutionStatus("Succeeded"),
							LastStatusChange: aws.Time(now.Add(-8 * time.Minute)),
							Summary:          aws.String("build complete"),
						},
					}},
				},
				{
					StageName: aws.String("DeployProd"),
					LatestExecution: &codepipelinetypes.StageExecution{
						PipelineExecutionId: aws.String("exec-1"),
						Status:              codepipelinetypes.StageExecutionStatus("Succeeded"),
					},
					ActionStates: []codepipelinetypes.ActionState{{
						ActionName: aws.String("DeployProd"),
						LatestExecution: &codepipelinetypes.ActionExecution{
							Status:           codepipelinetypes.ActionExecutionStatus("Succeeded"),
							LastStatusChange: aws.Time(now.Add(-6 * time.Minute)),
							Summary:          aws.String("prod deployed"),
						},
					}},
				},
			},
		},
		execsOutput: &codepipeline.ListPipelineExecutionsOutput{
			PipelineExecutionSummaries: []codepipelinetypes.PipelineExecutionSummary{{
				PipelineExecutionId: aws.String("exec-1"),
				Status:              codepipelinetypes.PipelineExecutionStatus("Succeeded"),
				StatusSummary:       aws.String("deployed successfully"),
				StartTime:           aws.Time(now.Add(-10 * time.Minute)),
				LastUpdateTime:      aws.Time(now.Add(-6 * time.Minute)),
			}},
		},
	})

	report := client.Report(context.Background(), "backend", "BackendAPIPipeline")

	if report.Status != StatusSucceeded {
		t.Fatalf("expected status %q, got %q", StatusSucceeded, report.Status)
	}
	if report.CurrentStage != "DeployProd" {
		t.Fatalf("expected current stage DeployProd, got %q", report.CurrentStage)
	}
	if report.Detail != "deployed successfully" {
		t.Fatalf("expected detail %q, got %q", "deployed successfully", report.Detail)
	}
	if len(report.Stages) != 2 {
		t.Fatalf("expected 2 stages, got %d", len(report.Stages))
	}
}

func TestClientReport_InProgressUsesActiveStageDetail(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	client := NewClient(&stubCodePipelineAPI{
		stateOutput: &codepipeline.GetPipelineStateOutput{
			PipelineName: aws.String("PersonalWebsitePipeline"),
			StageStates: []codepipelinetypes.StageState{
				{
					StageName: aws.String("Build"),
					LatestExecution: &codepipelinetypes.StageExecution{
						PipelineExecutionId: aws.String("exec-2"),
						Status:              codepipelinetypes.StageExecutionStatus("Succeeded"),
					},
				},
				{
					StageName: aws.String("InvalidateProdCache"),
					LatestExecution: &codepipelinetypes.StageExecution{
						PipelineExecutionId: aws.String("exec-2"),
						Status:              codepipelinetypes.StageExecutionStatus("InProgress"),
					},
					ActionStates: []codepipelinetypes.ActionState{{
						ActionName: aws.String("InvalidateProdCache"),
						LatestExecution: &codepipelinetypes.ActionExecution{
							Status:           codepipelinetypes.ActionExecutionStatus("InProgress"),
							LastStatusChange: aws.Time(now.Add(-2 * time.Minute)),
							Summary:          aws.String("waiting on CodeBuild"),
						},
					}},
				},
			},
		},
		execsOutput: &codepipeline.ListPipelineExecutionsOutput{
			PipelineExecutionSummaries: []codepipelinetypes.PipelineExecutionSummary{{
				PipelineExecutionId: aws.String("exec-2"),
				Status:              codepipelinetypes.PipelineExecutionStatus("InProgress"),
				StartTime:           aws.Time(now.Add(-5 * time.Minute)),
				LastUpdateTime:      aws.Time(now.Add(-2 * time.Minute)),
			}},
		},
	})

	report := client.Report(context.Background(), "website", "PersonalWebsitePipeline")

	if report.Status != StatusInProgress {
		t.Fatalf("expected status %q, got %q", StatusInProgress, report.Status)
	}
	if report.CurrentStage != "InvalidateProdCache" {
		t.Fatalf("expected active stage InvalidateProdCache, got %q", report.CurrentStage)
	}
	if report.Detail != "waiting on CodeBuild" {
		t.Fatalf("expected detail %q, got %q", "waiting on CodeBuild", report.Detail)
	}
}

func TestClientReport_NormalizesAPIError(t *testing.T) {
	client := NewClient(&stubCodePipelineAPI{
		stateErr: errors.New("boom"),
	})

	report := client.Report(context.Background(), "terraform", "TerraformInfrastructurePipeline")

	if report.Status != StatusError {
		t.Fatalf("expected error status, got %q", report.Status)
	}
	if report.Detail != "boom" {
		t.Fatalf("expected error detail boom, got %q", report.Detail)
	}
	if report.LogicalName != "terraform" {
		t.Fatalf("expected logical name terraform, got %q", report.LogicalName)
	}
}
