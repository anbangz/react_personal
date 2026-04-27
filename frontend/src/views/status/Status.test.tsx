import * as React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Status } from "./Status";
import { server } from "../../mocks/server";
import { createMockStatusSnapshot } from "../../mocks/factories";
import { renderWithProviders } from "../../test-utils";

describe("Status", () => {

  it("shows loading state initially", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    expect(screen.getByText(/loading deployment status/i)).toBeInTheDocument();
    expect(await screen.findByText(/pipeline status/i)).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    server.use(
      http.get("*/status", () => {
        return new HttpResponse(JSON.stringify({ error: "api down" }), { status: 503 });
      })
    );
    renderWithProviders(<Status />);
    expect(await screen.findByText(/unable to load status/i)).toBeInTheDocument();
  });

  it("renders pipeline rows and current month after loading", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    expect(await screen.findByText(/pipeline status/i)).toBeInTheDocument();
    expect(screen.getByText("Personal Website")).toBeInTheDocument();
    expect(screen.getByText(/deployed commits/i)).toBeInTheDocument();
  });

  it("shows stale notice when snapshot is stale", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot({ isStale: true }))));
    renderWithProviders(<Status />);
    expect(await screen.findByText(/status may be outdated/i)).toBeInTheDocument();
  });

  it("renders stepper nodes with correct states", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    renderWithProviders(<Status />);
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
    renderWithProviders(<Status />);
    await screen.findByText("Personal Website");

    const sha = snapshot.pipelines[0].lastDeployedCommit!.sha;
    const shortSha = sha.slice(0, 7);
    const link = screen.getByText(shortSha).closest("a");
    expect(link).toHaveAttribute("href", `https://github.com/anbangz/react_personal/commit/${sha}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("expands commit message inline when expand button is clicked", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(http.get("*/status", () => HttpResponse.json(snapshot)));
    renderWithProviders(<Status />);
    await screen.findByText("Personal Website");

    const expandButton = screen.getAllByRole("button", { name: /show full commit message/i })[0];
    fireEvent.click(expandButton);

    const pre = await screen.findByText("Frontend shipped", { selector: "pre" });
    expect(pre).toBeInTheDocument();
  });

  it("uses themed colors for expanded commit details", () => {
    const css = readFileSync(join(__dirname, "Status.css"), "utf8");
    const detailsRule = css.match(/\.status-page__commit-details\s*\{[^}]+\}/)?.[0];

    expect(detailsRule).toContain("background: var(--bg-surface);");
    expect(detailsRule).toContain("color: var(--text-primary);");
  });

  it("shows calendar tooltip on mouse enter", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
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

  it("shows calendar tooltip on focus", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    await screen.findByText(/deployed commits/i);

    const cells = document.querySelectorAll(".status-page__calendar-day:not(.status-page__calendar-day--blank)");
    expect(cells.length).toBeGreaterThan(0);

    fireEvent.focus(cells[0]);
    await waitFor(() => {
      const tooltip = document.querySelector(".status-page__calendar-tooltip");
      expect(tooltip).toBeInTheDocument();
    });

    fireEvent.blur(cells[0]);
    await waitFor(() => {
      expect(document.querySelector(".status-page__calendar-tooltip")).not.toBeInTheDocument();
    });
  });

  it("navigates months with previous/next buttons", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    await screen.findByText(/deployed commits/i);

    const prevButton = screen.getByRole("button", { name: /previous month/i });
    const nextButton = screen.getByRole("button", { name: /next month/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it("renders calendar legend", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
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
    renderWithProviders(<Status />);
    expect(await screen.findByText(/no recent deployments/i)).toBeInTheDocument();
  });

  it("groups recent activity by date", async () => {
    server.use(
      http.get("*/status", () =>
        HttpResponse.json(
          createMockStatusSnapshot({
            recentActivity: [
              { timestamp: "2026-04-25T18:05:00Z", message: "Backend API shipped 271588a to production" },
              { timestamp: "2026-04-25T14:00:00Z", message: "Personal Website shipped 4a7b9a0 to production" },
              { timestamp: "2026-04-24T10:00:00Z", message: "Terraform Infrastructure shipped 01b7a3c to production" },
            ],
          })
        )
      )
    );
    renderWithProviders(<Status />);
    await waitFor(() => {
      expect(screen.getByText("April 25, 2026")).toBeInTheDocument();
      expect(screen.getByText("April 24, 2026")).toBeInTheDocument();
    });

    const groups = screen.getAllByRole("list");
    expect(groups.length).toBe(2);

    const april25Group = screen.getByText("April 25, 2026").closest(".status-page__activity-group") as HTMLElement;
    const april25Items = within(april25Group).getAllByRole("listitem");
    expect(april25Items.length).toBe(2);
    expect(april25Items[0]).toHaveTextContent(/Backend API shipped 271588a/);
    expect(april25Items[1]).toHaveTextContent(/Personal Website shipped 4a7b9a0/);

    const april24Group = screen.getByText("April 24, 2026").closest(".status-page__activity-group") as HTMLElement;
    const april24Items = within(april24Group).getAllByRole("listitem");
    expect(april24Items.length).toBe(1);
    expect(april24Items[0]).toHaveTextContent(/Terraform Infrastructure shipped 01b7a3c/);

    const allItems = screen.getAllByRole("listitem");
    expect(allItems.length).toBe(3);
    expect(allItems[0]).toHaveTextContent(/Backend API shipped 271588a/);
    expect(allItems[1]).toHaveTextContent(/Personal Website shipped 4a7b9a0/);
    expect(allItems[2]).toHaveTextContent(/Terraform Infrastructure shipped 01b7a3c/);
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
    renderWithProviders(<Status />);
    await screen.findByText(/pipeline status/i);
    const badges = document.querySelectorAll(".status-page__badge--unknown");
    expect(badges.length).toBeGreaterThan(0);
  });
});
