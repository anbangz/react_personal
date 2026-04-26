export type PipelineStatus = "succeeded" | "running" | "failed" | "unknown";
export type StatusStageState = "completed" | "active" | "failed" | "pending";

export interface StatusStage {
  key: string;
  label: string;
  state: StatusStageState;
}

export interface DeployedCommit {
  sha: string;
  message: string;
}

export interface PipelineSnapshot {
  key: string;
  label: string;
  description: string;
  status: PipelineStatus;
  statusMessage: string;
  stages: StatusStage[];
  activeStageKey: string | null;
  lastExecutionStartedAt?: string;
  lastExecutionFinishedAt?: string;
  lastDeployedCommit?: DeployedCommit;
}

export interface CalendarDay {
  date: string;
  deployedCommitCount: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  label: string;
  leadingBlankDays: number;
  trailingBlankDays: number;
  days: CalendarDay[];
}

export interface StatusSnapshot {
  generatedAt: string;
  staleAfter: string;
  isStale: boolean;
  pipelines: PipelineSnapshot[];
  calendar: { months: CalendarMonth[] };
  recentActivity: Array<{ timestamp: string; message: string }>;
}
