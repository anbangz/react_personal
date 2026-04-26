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

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div
      className="status-page__step-connector"
      style={{ background: isCompleted ? "var(--status-success)" : "var(--status-track-bg)" }}
      aria-hidden="true"
    />
  );
}

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

function CommitDetailModal({
  sha,
  message,
  isOpen,
  onClose,
  triggerRef,
}: {
  sha: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    if (dialog) {
      const closeButton = dialog.querySelector<HTMLElement>(".status-page__modal-close");
      closeButton?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getClientRects().length > 0);

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const title = extractCommitTitle(message);
  const body = extractCommitBody(message);

  return (
    <div className="status-page__modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="status-page__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-detail-title"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="status-page__modal-header">
          <h3 id="commit-detail-title">Commit Details</h3>
          <button
            type="button"
            className="status-page__modal-close"
            onClick={onClose}
            aria-label="Close commit details"
          >
            ×
          </button>
        </div>
        <div className="status-page__modal-body">
          <a
            href={buildGitHubCommitUrl(sha)}
            target="_blank"
            rel="noopener noreferrer"
            className="status-page__modal-sha"
          >
            {sha}
            <span className="status-page__modal-sha-icon" aria-hidden="true">↗</span>
          </a>
          <p className="status-page__modal-commit-title">{title}</p>
          {body && (
            <pre className="status-page__modal-commit-body">{body}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineRail({ pipeline }: { pipeline: PipelineSnapshot }) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const expandButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="status-page__pipeline-row">
      <div>
        <h2>{pipeline.label}</h2>
        <p>{pipeline.description}</p>
        <span className={`status-page__badge status-page__badge--${pipeline.status}`}>
          {STATUS_LABELS[pipeline.status]}
        </span>
      </div>

      <div>
        <div className="status-page__rail-meta">
          <span>{pipeline.statusMessage}</span>
          {pipeline.lastExecutionFinishedAt ? (
            <time dateTime={pipeline.lastExecutionFinishedAt}>
              {formatRelativeTimestamp(pipeline.lastExecutionFinishedAt)}
            </time>
          ) : (
            <span>Awaiting execution</span>
          )}
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
                onClick={() => setIsModalOpen(true)}
                aria-label="Show full commit message"
                ref={expandButtonRef}
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
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            <CommitDetailModal
              sha={pipeline.lastDeployedCommit.sha}
              message={parseCommitMessage(pipeline.lastDeployedCommit.message)}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              triggerRef={expandButtonRef}
            />
          </>
        ) : (
          <span className="status-page__empty">No deployed revision yet</span>
        )}
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

function CalendarDayCell({ day }: { day: CalendarDay }) {
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
      aria-describedby={showTooltip ? tooltipId : undefined}
    >
      {showTooltip && (
        <span id={tooltipId} className="status-page__calendar-tooltip" role="tooltip">
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
        {month.days.map((day) => (
          <CalendarDayCell key={day.date} day={day} />
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
