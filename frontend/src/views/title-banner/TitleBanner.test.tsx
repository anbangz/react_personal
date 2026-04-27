import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { TitleBanner } from "./TitleBanner";

describe("TitleBanner", () => {
  it("renders heading and portrait", () => {
    renderWithProviders(<TitleBanner />);
    expect(screen.getByText("Hi! I'm Anbang.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "I'm a Senior Software Engineering Manager based out of NYC."
      )
    ).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Anbang")).toBeInTheDocument();
  });
});
