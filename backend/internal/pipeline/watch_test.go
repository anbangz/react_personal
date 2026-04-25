package pipeline

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"
)

func TestWatcherRun_PollsUntilTerminal(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	sequences := [][]Report{
		{{LogicalName: "backend", PipelineName: "BackendAPIPipeline", Status: StatusInProgress, CurrentStage: "DeployProd", UpdatedAt: now.Add(-1 * time.Minute), Detail: "deploying"}},
		{{LogicalName: "backend", PipelineName: "BackendAPIPipeline", Status: StatusSucceeded, CurrentStage: "DeployProd", UpdatedAt: now, Detail: "done"}},
	}

	var snapshotCalls int
	var sleepCalls int
	var out bytes.Buffer

	watcher := Watcher{
		Interval: time.Second,
		Snapshot: func(ctx context.Context) []Report {
			idx := snapshotCalls
			if idx >= len(sequences) {
				idx = len(sequences) - 1
			}
			snapshotCalls++
			return sequences[idx]
		},
		Now: func() time.Time { return now },
		Sleep: func(ctx context.Context, d time.Duration) error {
			sleepCalls++
			return nil
		},
		Clear: func(w *bytes.Buffer) {
			w.WriteString("[clear]\n")
		},
	}

	if err := watcher.Run(context.Background(), &out, false); err != nil {
		t.Fatalf("unexpected watch error: %v", err)
	}

	if snapshotCalls != 2 {
		t.Fatalf("expected 2 snapshots, got %d", snapshotCalls)
	}
	if sleepCalls != 1 {
		t.Fatalf("expected 1 sleep, got %d", sleepCalls)
	}
	if !strings.Contains(out.String(), "done") {
		t.Fatalf("expected final output to contain terminal status, got:\n%s", out.String())
	}
}

func TestWatcherRun_StopsImmediatelyForIdle(t *testing.T) {
	now := time.Date(2026, 4, 25, 12, 0, 0, 0, time.UTC)
	var sleepCalls int
	var out bytes.Buffer

	watcher := Watcher{
		Interval: time.Second,
		Snapshot: func(ctx context.Context) []Report {
			return []Report{{
				LogicalName:  "terraform",
				PipelineName: "TerraformInfrastructurePipeline",
				Status:       StatusIdle,
				CurrentStage: "-",
				UpdatedAt:    now,
				Detail:       "no recent executions",
			}}
		},
		Now:   func() time.Time { return now },
		Sleep: func(ctx context.Context, d time.Duration) error { sleepCalls++; return nil },
		Clear: func(w *bytes.Buffer) {},
	}

	if err := watcher.Run(context.Background(), &out, false); err != nil {
		t.Fatalf("unexpected watch error: %v", err)
	}

	if sleepCalls != 0 {
		t.Fatalf("expected 0 sleeps, got %d", sleepCalls)
	}
	if !strings.Contains(out.String(), "no recent executions") {
		t.Fatalf("expected idle output, got:\n%s", out.String())
	}
}
