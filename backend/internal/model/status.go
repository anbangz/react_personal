package model

import "time"

type PipelineStatus string

const (
	PipelineStatusSucceeded PipelineStatus = "succeeded"
	PipelineStatusRunning   PipelineStatus = "running"
	PipelineStatusFailed    PipelineStatus = "failed"
	PipelineStatusUnknown   PipelineStatus = "unknown"
)

type StatusStageState string

const (
	StatusStageStateCompleted StatusStageState = "completed"
	StatusStageStateActive    StatusStageState = "active"
	StatusStageStateFailed    StatusStageState = "failed"
	StatusStageStatePending   StatusStageState = "pending"
)

type StatusStage struct {
	Key   string           `json:"key"`
	Label string           `json:"label"`
	State StatusStageState `json:"state"`
}

type DeployedCommit struct {
	SHA     string `json:"sha"`
	Message string `json:"message"`
}

type PipelineSnapshot struct {
	Key                     string          `json:"key"`
	Label                   string          `json:"label"`
	Description             string          `json:"description"`
	Status                  PipelineStatus  `json:"status"`
	StatusMessage           string          `json:"statusMessage"`
	Stages                  []StatusStage   `json:"stages"`
	ActiveStageKey          *string         `json:"activeStageKey"`
	LastExecutionStartedAt  *time.Time      `json:"lastExecutionStartedAt,omitempty"`
	LastExecutionFinishedAt *time.Time      `json:"lastExecutionFinishedAt,omitempty"`
	LastDeployedCommit      *DeployedCommit `json:"lastDeployedCommit,omitempty"`
}

type CalendarDay struct {
	Date                string `json:"date"`
	DeployedCommitCount int    `json:"deployedCommitCount"`
}

type CalendarMonth struct {
	Year              int           `json:"year"`
	Month             int           `json:"month"`
	Label             string        `json:"label"`
	LeadingBlankDays  int           `json:"leadingBlankDays"`
	TrailingBlankDays int           `json:"trailingBlankDays"`
	Days              []CalendarDay `json:"days"`
}

type CalendarSnapshot struct {
	Months []CalendarMonth `json:"months"`
}

type ActivityItem struct {
	Timestamp time.Time `json:"timestamp"`
	Message   string    `json:"message"`
}

type StatusSnapshot struct {
	GeneratedAt    time.Time          `json:"generatedAt"`
	StaleAfter     time.Time          `json:"staleAfter"`
	IsStale        bool               `json:"isStale"`
	Pipelines      []PipelineSnapshot `json:"pipelines"`
	Calendar       CalendarSnapshot   `json:"calendar"`
	RecentActivity []ActivityItem     `json:"recentActivity"`
}
