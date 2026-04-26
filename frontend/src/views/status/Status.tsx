import * as React from "react";
import { fetchStatus } from "../../api/client";
import { CalendarMonth, PipelineSnapshot, PipelineStatus, StatusSnapshot } from "../../status/types";
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

const STATUS_LABELS: Record<PipelineStatus, string> = {
  succeeded: "Succeeded",
  running: "In Progress",
  failed: "Failed",
  unknown: "Unknown",
};

function PipelineRail({ pipeline }: { pipeline: PipelineSnapshot }) {
  const activeIndex = pipeline.stages.findIndex((stage) => stage.state === "active" || stage.state === "failed");
  const progressSteps = activeIndex === -1 ? Math.max(pipeline.stages.length - 1, 0) : activeIndex;

  return (
    <div className="status-page__pipeline-row">
      <div>
        <h2>{pipeline.label}</h2>
        <p>{pipeline.description}</p>
        <span className={`status-page__badge status-page__badge--${pipeline.status}`}>{STATUS_LABELS[pipeline.status]}</span>
      </div>
      <div>
        <div className="status-page__rail-meta">
          <span>{pipeline.statusMessage}</span>
          {pipeline.lastExecutionFinishedAt
            ? <time dateTime={pipeline.lastExecutionFinishedAt}>{formatRelativeTimestamp(pipeline.lastExecutionFinishedAt)}</time>
            : <span>Awaiting execution</span>}
        </div>
        <div className="status-page__rail" style={{ ["--stage-count" as string]: pipeline.stages.length, ["--progress-steps" as string]: progressSteps }}>
          <div className="status-page__rail-track" />
          <div className="status-page__rail-fill" />
          <div className={`status-page__rail-stages status-page__rail-stages--${pipeline.stages.length}`}>
            {pipeline.stages.map((stage) => (
              <div key={stage.key} className="status-page__rail-stage">
                <span className="status-page__rail-label">{stage.label}</span>
                <span className={`status-page__rail-node status-page__rail-node--${stage.state}`} aria-label={`${stage.label}: ${stage.state}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="status-page__pipeline-meta">
        {pipeline.lastDeployedCommit ? <code>{truncateSHA(pipeline.lastDeployedCommit.sha)}</code> : null}
        <div>
          {pipeline.lastDeployedCommit
            ? parseCommitMessage(pipeline.lastDeployedCommit.message)
            : "No deployed revision yet"}
        </div>
      </div>
    </div>
  );
}

const DAY_LABELS = [
  { label: "S", title: "Sunday" },
  { label: "M", title: "Monday" },
  { label: "T", title: "Tuesday" },
  { label: "W", title: "Wednesday" },
  { label: "T", title: "Thursday" },
  { label: "F", title: "Friday" },
  { label: "S", title: "Saturday" },
] as const;

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
        {month.days.map((day) => (
          <div
            key={day.date}
            className={`status-page__calendar-day status-page__calendar-day--level-${Math.min(day.deployedCommitCount, 4)}`}
            aria-label={`${day.date}: ${day.deployedCommitCount} deployed revisions`}
            title={`${day.date}: ${day.deployedCommitCount} deployed revision${day.deployedCommitCount === 1 ? "" : "s"}`}
          />
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
      {totalCommits === 0 && <p className="status-page__empty">No deployments this month.</p>}
    </div>
  );
}

export function Status(): React.ReactElement {
  const [snapshot, setSnapshot] = React.useState<StatusSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchStatus()
      .then((result) => {
        if (!active) return;
        setSnapshot(result);
        setMonthIndex(Math.max(result.calendar.months.length - 1, 0));
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

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
        </div>
        <div>
          <span>Last Updated</span>
          <strong>
            <time dateTime={snapshot.generatedAt}>{formatRelativeTimestamp(snapshot.generatedAt)}</time>
          </strong>
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
            <div>
              <button type="button" className="button is-small" onClick={() => setMonthIndex((value) => (value ?? 0) - 1)} disabled={monthIndex === 0} aria-label="Previous month">Previous</button>
              <span>{month.label}</span>
              <button type="button" className="button is-small" onClick={() => setMonthIndex((value) => (value ?? 0) + 1)} disabled={monthIndex === snapshot.calendar.months.length - 1} aria-label="Next month">Next</button>
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
                  <span>{item.message}</span>
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
