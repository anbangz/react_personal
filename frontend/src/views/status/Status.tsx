import * as React from "react";
import { fetchStatus } from "../../api/client";
import { CalendarMonth, PipelineSnapshot, StatusSnapshot } from "../../status/types";
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

function PipelineRail({ pipeline }: { pipeline: PipelineSnapshot }) {
  const activeIndex = pipeline.stages.findIndex((stage) => stage.state === "active" || stage.state === "failed");
  const progressSteps = activeIndex === -1 ? Math.max(pipeline.stages.length - 1, 0) : activeIndex;

  return (
    <div className="status-page__pipeline-row">
      <div>
        <h2>{pipeline.label}</h2>
        <p>{pipeline.description}</p>
        <span className={`status-page__badge status-page__badge--${pipeline.status}`}>{pipeline.status}</span>
      </div>
      <div>
        <div className="status-page__rail-meta">
          <span>{pipeline.statusMessage}</span>
          <span>{pipeline.lastExecutionFinishedAt ? formatRelativeTimestamp(pipeline.lastExecutionFinishedAt) : "Awaiting execution"}</span>
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
        {pipeline.lastDeployedCommit ? <code>{pipeline.lastDeployedCommit.sha}</code> : null}
        <div>{pipeline.lastDeployedCommit?.message ?? "No deployed revision yet"}</div>
      </div>
    </div>
  );
}

function CalendarMonthView({ month }: { month: CalendarMonth }) {
  return (
    <div className="status-page__calendar-grid">
      {Array.from({ length: month.leadingBlankDays }).map((_, index) => (
        <span key={`leading-${index}`} className="status-page__calendar-day status-page__calendar-day--blank" />
      ))}
      {month.days.map((day) => (
        <div
          key={day.date}
          className={`status-page__calendar-day status-page__calendar-day--level-${Math.min(day.deployedCommitCount, 4)}`}
          aria-label={`${day.date}: ${day.deployedCommitCount} deployed revisions`}
        />
      ))}
      {Array.from({ length: month.trailingBlankDays }).map((_, index) => (
        <span key={`trailing-${index}`} className="status-page__calendar-day status-page__calendar-day--blank" />
      ))}
    </div>
  );
}

export function Status(): React.ReactElement {
  const [snapshot, setSnapshot] = React.useState<StatusSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

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
    return <section className="status-page container"><p>Failed to load deployment status. {error}</p></section>;
  }

  if (snapshot === null) {
    return <section className="status-page container"><p>Loading deployment status...</p></section>;
  }

  const month = snapshot.calendar.months[monthIndex];

  return (
    <section className="status-page container">
      <header className="status-page__hero">
        <div>
          <h1>Deployment Status</h1>
          <p>A public view into how the site ships.</p>
          {snapshot.isStale ? <p>Status may be outdated.</p> : null}
        </div>
        <div>
          <span>Last Updated</span>
          <strong>{formatRelativeTimestamp(snapshot.generatedAt)}</strong>
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
              <button type="button" onClick={() => setMonthIndex((value) => value - 1)} disabled={monthIndex === 0} aria-label="Previous month">Previous</button>
              <span>{month.label}</span>
              <button type="button" onClick={() => setMonthIndex((value) => value + 1)} disabled={monthIndex === snapshot.calendar.months.length - 1} aria-label="Next month">Next</button>
            </div>
          </div>
          <CalendarMonthView month={month} />
        </div>

        <div className="status-page__panel">
          <h2>Recent Activity</h2>
          <ul>
            {snapshot.recentActivity.map((item) => (
              <li key={`${item.timestamp}-${item.message}`}>
                <span>{formatRelativeTimestamp(item.timestamp)}</span>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
