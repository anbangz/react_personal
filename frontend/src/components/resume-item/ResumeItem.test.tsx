import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { ResumeItem } from "./ResumeItem";

describe("ResumeItem", () => {
  it("renders title and subtitle", () => {
    renderWithProviders(
      <ResumeItem title="Amazon" subtitle="SDE" image="img.jpg" />
    );
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("SDE")).toBeInTheDocument();
  });

  it("applies reverse class when reverse is true", () => {
    renderWithProviders(
      <ResumeItem title="Amazon" subtitle="SDE" image="img.jpg" reverse />
    );
    const item = screen.getByText("Amazon").closest(".experience-item");
    expect(item).toHaveClass("experience-item--reverse");
  });

  it("renders image with alt text", () => {
    renderWithProviders(
      <ResumeItem title="Amazon" subtitle="SDE" image="img.jpg" />
    );
    expect(screen.getByAltText("Amazon")).toHaveAttribute("src", "img.jpg");
  });

  it("renders children in description slot", () => {
    renderWithProviders(
      <ResumeItem title="Amazon" subtitle="SDE" image="img.jpg">
        <p>Description text</p>
      </ResumeItem>
    );
    expect(screen.getByText("Description text")).toBeInTheDocument();
  });
});
