import * as React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { createMockStatusSnapshot } from "../../mocks/factories";
import { renderWithProviders } from "../../test-utils";
import { Status } from "./Status";

describe("Status", () => {
  it("shows loading state initially", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    expect(screen.getByText(/loading deployment status/i)).toBeInTheDocument();
    await screen.findByText("Personal Website");
  });

  it("shows error message when fetch fails", async () => {
    server.use(
      http.get("*/status", () => {
        return new HttpResponse(JSON.stringify({ error: "api down" }), { status: 503 });
      })
    );
    renderWithProviders(<Status />);
    expect(await screen.findByText(/failed to load deployment status/i)).toBeInTheDocument();
    expect(screen.getByText(/api down/i)).toBeInTheDocument();
  });

  it("renders pipeline rows and current month after loading", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);

    expect(await screen.findByText("Personal Website")).toBeInTheDocument();
    expect(screen.getByText("April 2026")).toBeInTheDocument();
    expect(screen.getByText(/current step: ship to production/i)).toBeInTheDocument();
  });

  it("shows stale data messaging when the snapshot is stale", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot({ isStale: true }))));
    renderWithProviders(<Status />);

    expect(await screen.findByText(/status may be outdated/i)).toBeInTheDocument();
  });

  it("pages to the previous month without refetching", async () => {
    const requestSpy = jest.fn();
    server.use(
      http.get("*/status", () => {
        requestSpy();
        return HttpResponse.json(createMockStatusSnapshot({
          calendar: {
            months: [
              {
                year: 2026,
                month: 3,
                label: "March 2026",
                leadingBlankDays: 0,
                trailingBlankDays: 0,
                days: Array.from({ length: 31 }, (_, index) => ({ date: `2026-03-${String(index + 1).padStart(2, "0")}`, deployedCommitCount: 0 })),
              },
              ...createMockStatusSnapshot().calendar.months,
            ],
          },
        }));
      })
    );

    renderWithProviders(<Status />);
    expect(await screen.findByText("April 2026")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it("truncates a long SHA to 7 characters", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(
      http.get("*/status", () =>
        HttpResponse.json(
          createMockStatusSnapshot({
            pipelines: [
              {
                ...snapshot.pipelines[0],
                lastDeployedCommit: {
                  sha: "ae776c9e138fd97003d404de730ae776",
                  message: "fix: update deps",
                },
              },
              ...snapshot.pipelines.slice(1),
            ],
          })
        )
      )
    );
    renderWithProviders(<Status />);
    await screen.findByText("Personal Website");
    expect(screen.getByText("ae776c9")).toBeInTheDocument();
    expect(screen.queryByText("ae776c9e138fd97003d404de730ae776")).not.toBeInTheDocument();
  });

  it("parses a JSON RevisionSummary and displays only the CommitMessage", async () => {
    const snapshot = createMockStatusSnapshot();
    server.use(
      http.get("*/status", () =>
        HttpResponse.json(
          createMockStatusSnapshot({
            pipelines: [
              {
                ...snapshot.pipelines[0],
                lastDeployedCommit: {
                  sha: "ae776c9",
                  message: JSON.stringify({
                    ProviderType: "GitHub",
                    CommitMessage: "fix: update deps",
                    CommitId: "ae776c9",
                  }),
                },
              },
              ...snapshot.pipelines.slice(1),
            ],
          })
        )
      )
    );
    renderWithProviders(<Status />);
    await screen.findByText("Personal Website");
    expect(screen.getByText("fix: update deps")).toBeInTheDocument();
    expect(screen.queryByText(/ProviderType/)).not.toBeInTheDocument();
  });

  it("wraps timestamps in <time dateTime> elements", async () => {
    server.use(http.get("*/status", () => HttpResponse.json(createMockStatusSnapshot())));
    renderWithProviders(<Status />);
    await screen.findByText("Personal Website");
    // Hero "Last Updated" timestamp
    expect(document.querySelector('time[dateTime="2026-04-25T18:10:00Z"]')).toBeInTheDocument();
    // Recent Activity timestamp
    expect(document.querySelector('time[dateTime="2026-04-25T18:05:00Z"]')).toBeInTheDocument();
  });
});
