import * as React from "react";
import { fetchStatus } from "../../api/client";
import { CalendarDay, CalendarMonth, PipelineSnapshot, PipelineStatus, StatusSnapshot, StatusStage } from "../../status/types";
import "./Status.css";

function formatRelativeTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Unknown";
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function truncateSHA(sha: string): string {
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

function parseCommitMessage(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "CommitMessage" in parsed &&
      typeof (parsed as Record<string, unknown>).CommitMessage === "string"
    ) {
      return (parsed as Record<string, string>).CommitMessage;
    }
  } catch {
    // not JSON — use as-is
  }
  return raw;
}

function extractCommitTitle(message: string): string {
  const normalized = message.replace(/\r\n/g, "\n");
  const firstNewline = normalized.indexOf("\n");
  if (firstNewline === -1) return normalized.trim();
  return normalized.slice(0, firstNewline).trim();
}

function extractCommitBody(message: string): string {
  const normalized = message.replace(/\r\n/g, "\n");
  const firstNewline = normalized.indexOf("\n");
  if (firstNewline === -1) return "";
  return normalized.slice(firstNewline + 1).trim();
}

function buildGitHubCommitUrl(sha: string): string {
  return `https://github.com/anbangz/react_personal/commit/${sha}`;
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  succeeded: "Succeeded",
  running: "In Progress",
  failed: "Failed",
  unknown: "Unknown",
};

const STATUS_ICONS: Record<PipelineStatus, string> = {
  succeeded: "✓",
  running: "⟳",
  failed: "✕",
  unknown: "?",
};

function linkifyActivityMessage(message: string): React.ReactNode {
  const shaMatch = message.match(/\b([a-f0-9]{7,40})\b/i);
  if (!shaMatch) return <span>{message}</span>;
  const sha = shaMatch[1];
  const before = message.slice(0, shaMatch.index);
  const after = message.slice(shaMatch.index! + sha.length);
  return (
    <>
      <span>{before}</span>
      <a
        href={buildGitHubCommitUrl(sha)}
        target="_blank"
        rel="noopener noreferrer"
        className="status-page__activity-sha"
      >
        <code>{sha}</code>
      </a>
      <span>{after}</span>
    </>
  );
}

interface ActivityGroup {
  dateLabel: string;
  items: Array<{ timestamp: string; message: string }>;
}

function groupActivityByDate(
  items: Array<{ timestamp: string; message: string }>
): ActivityGroup[] {
  const map = new Map<string, Array<{ timestamp: string; message: string }>>();
  for (const item of items) {
    const date = new Date(item.timestamp);
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const existing = map.get(label);
    if (existing) {
      existing.push(item);
    } else {
      map.set(label, [item]);
    }
  }
  // Sort groups by the first item's timestamp descending
  const groups: ActivityGroup[] = [];
  for (const [dateLabel, groupItems] of map) {
    groups.push({ dateLabel, items: groupItems });
  }
  groups.sort((a, b) => {
    const aTime = Date.parse(a.items[0].timestamp);
    const bTime = Date.parse(b.items[0].timestamp);
    return bTime - aTime;
  });
  return groups;
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div
      className="status-page__step-connector"
      style={{ background: isCompleted ? "var(--status-success)" : "var(--status-track-bg)" }}
      aria-hidden="true"
    />
  );
}

/* Each state uses a distinct glyph or animation so color is never the sole indicator. */
function StepNode({ stage, index }: { stage: StatusStage; index: number }) {
  const nodeContent =
    stage.state === "completed" ? (
      <span aria-hidden="true">✓</span>
    ) : stage.state === "failed" ? (
      <span aria-hidden="true">✕</span>
    ) : (
      <span>{index + 1}</span>
    );

  return (
    <div
      className={`status-page__step-node status-page__step-node--${stage.state}`}
      aria-label={`${stage.label}: ${stage.state}`}
    >
      {nodeContent}
    </div>
  );
}

function PipelineRail({ pipeline }: { pipeline: PipelineSnapshot }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const durationMs =
    pipeline.lastExecutionStartedAt && pipeline.lastExecutionFinishedAt
      ? Date.parse(pipeline.lastExecutionFinishedAt) - Date.parse(pipeline.lastExecutionStartedAt)
      : null;
  const durationText =
    durationMs !== null && !Number.isNaN(durationMs)
      ? `${Math.round(durationMs / 1000)}s`
      : null;

  return (
    <div className="status-page__pipeline-row">
      <div>
        <h2>{pipeline.label}</h2>
        <p>{pipeline.description}</p>
        <span className={`status-page__badge status-page__badge--${pipeline.status}`}>
          <span className="status-page__badge-icon" aria-hidden="true">{STATUS_ICONS[pipeline.status]}</span>
          {STATUS_LABELS[pipeline.status]}
        </span>
      </div>

      <div>
        <div className="status-page__rail-meta">
          {pipeline.status !== "succeeded" ? (
            <span>{pipeline.statusMessage}</span>
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
          <span className="status-page__rail-meta-right">
            {durationText && <span className="status-page__duration" title="Total pipeline duration">{durationText}</span>}
            {pipeline.lastExecutionFinishedAt ? (
              <time dateTime={pipeline.lastExecutionFinishedAt}>
                {formatRelativeTimestamp(pipeline.lastExecutionFinishedAt)}
              </time>
            ) : (
              <span>Awaiting execution</span>
            )}
          </span>
        </div>

        <div className="status-page__stepper">
          {pipeline.stages.map((stage, index) => {
            const showConnector = index > 0;
            const connectorCompleted = pipeline.stages[index - 1]?.state === "completed";
            return (
              <React.Fragment key={stage.key}>
                {showConnector && <StepConnector isCompleted={connectorCompleted} />}
                <div className="status-page__step">
                  <StepNode stage={stage} index={index} />
                  <span className={`status-page__step-label status-page__step-label--${stage.state}`}>
                    {stage.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="status-page__pipeline-meta">
        {pipeline.lastDeployedCommit ? (
          <>
            <a
              href={buildGitHubCommitUrl(pipeline.lastDeployedCommit.sha)}
              target="_blank"
              rel="noopener noreferrer"
              className="status-page__commit-sha"
            >
              <code>{truncateSHA(pipeline.lastDeployedCommit.sha)}</code>
              <span className="status-page__commit-sha-icon" aria-hidden="true">↗</span>
            </a>
            <div className="status-page__commit-title-row">
              <span className="status-page__commit-title">
                {extractCommitTitle(parseCommitMessage(pipeline.lastDeployedCommit.message))}
              </span>
              <button
                type="button"
                className="status-page__commit-expand"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? "Hide full commit message" : "Show full commit message"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={isExpanded ? "status-page__commit-expand-icon--rotated" : ""}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            {isExpanded && (
              <div className="status-page__commit-details">
                <pre className="status-page__commit-body">{parseCommitMessage(pipeline.lastDeployedCommit.message)}</pre>
              </div>
            )}
          </>
        ) : (
          <span className="status-page__empty">No deployed revision yet</span>
        )}
      </div>
    </div>
  );
}

const DAY_LABELS = [
  { label: "Su", title: "Sunday" },
  { label: "Mo", title: "Monday" },
  { label: "Tu", title: "Tuesday" },
  { label: "We", title: "Wednesday" },
  { label: "Th", title: "Thursday" },
  { label: "Fr", title: "Friday" },
  { label: "Sa", title: "Saturday" },
] as const;

function CalendarDayCell({ day, index, leadingBlankDays }: { day: CalendarDay; index: number; leadingBlankDays: number }) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const handleFocus = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 200);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const row = Math.floor((index + leadingBlankDays) / 7);
  const isFirstRow = row === 0;
  const tooltipId = `tooltip-${day.date}`;

  const monthName = new Date(day.date + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const tooltipText =
    day.deployedCommitCount > 0
      ? `${day.deployedCommitCount} deployment${day.deployedCommitCount === 1 ? "" : "s"} on ${monthName}`
      : `No deployments on ${monthName}`;

  return (
    <div
      className={`status-page__calendar-day status-page__calendar-day--level-${Math.min(day.deployedCommitCount, 4)}`}
      aria-label={`${day.date}: ${day.deployedCommitCount} deployed revisions`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={showTooltip ? tooltipId : undefined}
    >
      {showTooltip && (
        <span id={tooltipId} className={`status-page__calendar-tooltip ${isFirstRow ? "status-page__calendar-tooltip--below" : ""}`} role="tooltip">
          {tooltipText}
        </span>
      )}
    </div>
  );
}

function CalendarMonthView({ month }: { month: CalendarMonth }) {
  const totalCommits = React.useMemo(() => month.days.reduce((sum, day) => sum + day.deployedCommitCount, 0), [month]);

  return (
    <div>
      <div className="status-page__calendar-day-headers">
        {DAY_LABELS.map((day, i) => (
          <abbr key={i} className="status-page__calendar-day-header" title={day.title}>{day.label}</abbr>
        ))}
      </div>
      <div className="status-page__calendar-grid">
        {Array.from({ length: month.leadingBlankDays }).map((_, index) => (
          <span key={`leading-${index}`} className="status-page__calendar-day status-page__calendar-day--blank" />
        ))}
        {month.days.map((day, index) => (
          <CalendarDayCell key={day.date} day={day} index={index} leadingBlankDays={month.leadingBlankDays} />
        ))}
        {Array.from({ length: month.trailingBlankDays }).map((_, index) => (
          <span key={`trailing-${index}`} className="status-page__calendar-day status-page__calendar-day--blank" />
        ))}
      </div>
      <div className="status-page__calendar-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`status-page__calendar-legend-swatch status-page__calendar-legend-swatch--${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export function Status(): React.ReactElement {
  const [snapshot, setSnapshot] = React.useState<StatusSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState<number | null>(null);
  const isLoadingRef = React.useRef(false);

  React.useEffect(() => {
    document.title = "Deployment Status \u00b7 Anbang Zhang";
  }, []);

  const loadStatus = React.useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setError(null);
    try {
      const result = await fetchStatus();
      setSnapshot(result);
      setMonthIndex(Math.max(result.calendar.months.length - 1, 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (error !== null) {
    return (
      <section className="status-page container">
        <div className="status-page__panel status-page__panel--error">
          <h2>Unable to load status</h2>
          <p>We couldn't fetch the latest deployment data. {error}</p>
        </div>
      </section>
    );
  }

  if (snapshot === null || monthIndex === null) {
    return <section className="status-page container"><p>Loading deployment status...</p></section>;
  }

  const month = snapshot.calendar.months[monthIndex];

  return (
    <section className="status-page container">
      <header className="status-page__hero">
        <div>
          <h1>Deployment Status</h1>
          <p>A public view into how the site ships.</p>
          {snapshot.isStale ? (
            <p className="status-page__stale-notice">
              <span role="img" aria-label="Warning">⚠</span> Status may be outdated.
            </p>
          ) : null}
          <div className="status-page__last-updated">
            <span>Last Updated</span>
            <span className="status-page__last-updated-separator" aria-hidden="true">·</span>
            <strong>
              <time
                dateTime={snapshot.generatedAt}
                title={snapshot.generatedAt}
                aria-label={`Last updated on ${snapshot.generatedAt}`}
              >
                {formatRelativeTimestamp(snapshot.generatedAt)}
              </time>
            </strong>
          </div>
        </div>
        <div>
          <button
            type="button"
            className="button is-small status-page__refresh"
            onClick={loadStatus}
            aria-label="Refresh status"
            title="Refresh status"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </header>

      <div className="status-page__panel">
        <h2>Pipeline Status</h2>
        {snapshot.pipelines.map((pipeline) => <PipelineRail key={pipeline.key} pipeline={pipeline} />)}
      </div>

      <div className="status-page__content-grid">
        <div className="status-page__panel">
          <div className="status-page__calendar-header">
            <h2>Deployed Commits</h2>
            <div className="status-page__calendar-controls">
              <button
                type="button"
                className="button is-icon"
                onClick={() => setMonthIndex((value) => (value ?? 0) - 1)}
                disabled={monthIndex === 0}
                aria-label="Previous month"
                title="Previous month"
              >
                <ChevronLeft />
              </button>
              <span className="status-page__calendar-month-label">{month.label}</span>
              <button
                type="button"
                className="button is-icon"
                onClick={() => setMonthIndex((value) => (value ?? 0) + 1)}
                disabled={monthIndex === snapshot.calendar.months.length - 1}
                aria-label="Next month"
                title={monthIndex === snapshot.calendar.months.length - 1 ? "No future months yet" : "Next month"}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <CalendarMonthView month={month} />
        </div>

        <div className="status-page__panel">
          <h2>Recent Activity</h2>
          {snapshot.recentActivity.length > 0 ? (
            <ul>
              {snapshot.recentActivity.map((item, index) => (
                <li key={`${item.timestamp}-${item.message}-${index}`}>
                  <time dateTime={item.timestamp}>{formatRelativeTimestamp(item.timestamp)}</time>
                  <span className="status-page__activity-separator" aria-hidden="true">·</span>
                  <span>{linkifyActivityMessage(item.message)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="status-page__empty">No recent deployments.</p>
          )}
        </div>
      </div>
    </section>
  );
}
