package pipeline

import "time"

type Status string

const (
	StatusIdle       Status = "Idle"
	StatusInProgress Status = "InProgress"
	StatusSucceeded  Status = "Succeeded"
	StatusFailed     Status = "Failed"
	StatusError      Status = "Error"
	StatusUnknown    Status = "Unknown"
)

type Report struct {
	LogicalName  string
	PipelineName string
	Status       Status
	CurrentStage string
	StartedAt    time.Time
	UpdatedAt    time.Time
	Detail       string
	Stages       []StageReport
}

type StageReport struct {
	Name      string
	Status    Status
	UpdatedAt time.Time
	Detail    string
}

func (s Status) IsActive() bool {
	return s == StatusInProgress
}

func AnyActive(reports []Report) bool {
	for _, report := range reports {
		if report.Status.IsActive() {
			return true
		}
	}

	return false
}
