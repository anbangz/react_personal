import { BlogPost, Photo } from "../blog/types";
import { StatusSnapshot } from "../status/types";

export const createMockPost = (overrides?: Partial<BlogPost>): BlogPost => ({
  id: "1",
  slug: "test-post",
  title: "Test Post",
  content: "Hello world",
  photos: [],
  published: true,
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
  ...overrides,
});

export const createMockPhoto = (overrides?: Partial<Photo>): Photo => ({
  src: "https://example.com/photo.jpg",
  caption: "A photo",
  order: 0,
  ...overrides,
});

export const createMockStatusSnapshot = (
  overrides?: Partial<StatusSnapshot>
): StatusSnapshot => ({
  generatedAt: "2026-04-25T18:10:00Z",
  staleAfter: "2026-04-25T18:25:00Z",
  isStale: false,
  pipelines: [
    {
      key: "frontend",
      label: "Personal Website",
      description: "Builds the React site and ships it through dev and production.",
      status: "succeeded",
      statusMessage: "Current step: Production is live",
      activeStageKey: null,
      stages: [
        { key: "source", label: "Fetch Code", state: "completed" },
        { key: "build", label: "Build Site", state: "completed" },
      ],
      lastExecutionFinishedAt: "2026-04-25T18:03:00Z",
      lastDeployedCommit: { sha: "4a7b9a0", message: "Frontend shipped" },
    },
    {
      key: "backend",
      label: "Backend API",
      description: "Compiles the Go API and pushes it to the Lambda environments.",
      status: "running",
      statusMessage: "Current step: Ship to Production",
      activeStageKey: "deploy-prod",
      stages: [
        { key: "source", label: "Fetch Code", state: "completed" },
        { key: "build", label: "Build API", state: "completed" },
        { key: "deploy-prod", label: "Ship to Production", state: "active" },
      ],
      lastExecutionStartedAt: "2026-04-25T18:05:00Z",
      lastDeployedCommit: { sha: "271588a", message: "Backend deploying" },
    },
    {
      key: "terraform",
      label: "Terraform Infrastructure",
      description: "Previews and applies Terraform changes for site infrastructure.",
      status: "failed",
      statusMessage: "Failed at: Apply Changes",
      activeStageKey: "apply",
      stages: [
        { key: "source", label: "Fetch Code", state: "completed" },
        { key: "apply", label: "Apply Changes", state: "failed" },
      ],
      lastDeployedCommit: { sha: "01b7a3c", message: "Terraform apply failed" },
    },
  ],
  calendar: {
    months: [
      {
        year: 2026,
        month: 4,
        label: "April 2026",
        leadingBlankDays: 2,
        trailingBlankDays: 3,
        days: Array.from({ length: 30 }, (_, index) => ({
          date: `2026-04-${String(index + 1).padStart(2, "0")}`,
          deployedCommitCount: index === 24 ? 2 : 0,
        })),
      },
    ],
  },
  recentActivity: [
    { timestamp: "2026-04-25T18:05:00Z", message: "Backend API entered Ship to Production for 271588a" },
  ],
  ...overrides,
});
