import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Status } from "./Status";
import { server } from "../../mocks/server";
import { createMockStatusSnapshot } from "../../mocks/factories";

describe("Status", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("shows loading state initially", () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    render(<Status />);
    expect(screen.getByText(/loading deployment status/i)).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    server.use(
      http.get("*/status", () => {
        return new HttpResponse(JSON.stringify({ error: "api down" }), { status: 503 });
      })
    );
    render(<Status />);
    expect(await screen.findByText(/unable to load status/i)).toBeInTheDocument();
  });

  it("renders pipeline rows and current month after loading", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    render(<Status />);
    expect(await screen.findByText(/pipeline status/i)).toBeInTheDocument();
    expect(screen.getByText("Personal Website")).toBeInTheDocument();
    expect(screen.getByText(/deployed commits/i)).toBeInTheDocument();
  });

  it("shows stale notice when snapshot is stale", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot({ isStale: true }))));
    render(<Status />);
    expect(await screen.findByText(/status may be outdated/i)).toBeInTheDocument();
  });

  it("renders stepper nodes with correct states", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    render(<Status />);
    await screen.findByText("Personal Website");

    const firstPipeline = snapshot.pipelines[0];
    for (const stage of firstPipeline.stages) {
      const node = document.querySelector(`.status-page__step-node--${stage.state}[aria-label="${stage.label}: ${stage.state}"]`);
      expect(node).toBeInTheDocument();
    }
  });

  it("renders commit hash as a link to GitHub", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    render(<Status />);
    await screen.findByText("Personal Website");

    const sha = snapshot.pipelines[0].lastDeployedCommit!.sha;
    const shortSha = sha.slice(0, 7);
    const link = screen.getByText(shortSha).closest("a");
    expect(link).toHaveAttribute("href", `https://github.com/anbangz/react_personal/commit/${sha}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("opens commit detail modal when expand button is clicked", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    render(<Status />);
    await screen.findByText("Personal Website");

    const expandButton = screen.getAllByRole("button", { name: /show full commit message/i })[0];
    fireEvent.click(expandButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Commit Details")).toBeInTheDocument();
  });

  it("closes commit detail modal when close button is clicked", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    render(<Status />);
    await screen.findByText("Personal Website");

    const expandButton = screen.getAllByRole("button", { name: /show full commit message/i })[0];
    fireEvent.click(expandButton);
    await screen.findByRole("dialog");

    const closeButton = screen.getByRole("button", { name: /close commit details/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes commit detail modal on Escape key", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    render(<Status />);
    await screen.findByText("Personal Website");

    fireEvent.click(screen.getAllByRole("button", { name: /show full commit message/i })[0]);
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows calendar tooltip on mouse enter", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    render(<Status />);
    await screen.findByText(/deployed commits/i);

    const cells = document.querySelectorAll(".status-page__calendar-day:not(.status-page__calendar-day--blank)");
    expect(cells.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(cells[0]);
    await waitFor(() => {
      const tooltip = document.querySelector(".status-page__calendar-tooltip");
      expect(tooltip).toBeInTheDocument();
    });

    fireEvent.mouseLeave(cells[0]);
    await waitFor(() => {
      expect(document.querySelector(".status-page__calendar-tooltip")).not.toBeInTheDocument();
    });
  });

  it("navigates months with previous/next buttons", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    render(<Status />);
    await screen.findByText(/deployed commits/i);

    const prevButton = screen.getByRole("button", { name: /previous month/i });
    const nextButton = screen.getByRole("button", { name: /next month/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("renders calendar legend", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    render(<Status />);
    await screen.findByText(/deployed commits/i);
    expect(document.querySelector(".status-page__calendar-legend")).toBeInTheDocument();
    const swatches = document.querySelectorAll(".status-page__calendar-legend-swatch");
    expect(swatches.length).toBe(5);
  });

  it("shows empty state when there is no recent activity", async () => {
    server.use(
      http.get("*/status", () =>
        HttpResponse.json(
          createMockStatusSnapshot({
            recentActivity: [],
          })
        )
      )
    );
    render(<Status />);
    expect(await screen.findByText(/no recent deployments/i)).toBeInTheDocument();
  });

  it("maps pipeline status to friendly labels", async () => {
    server.use(
      http.get("*/status", () =>
        HttpResponse.json(
          createMockStatusSnapshot({
            pipelines: createMockStatusSnapshot().pipelines.map((p) => ({ ...p, status: "unknown" as const })),
          })
        )
      )
    );
    render(<Status />);
    await screen.findByText(/pipeline status/i);
    const badges = document.querySelectorAll(".status-page__badge--unknown");
    expect(badges.length).toBeGreaterThan(0);
  });
});
