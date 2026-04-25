import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { TitleBanner } from "./TitleBanner";

describe("TitleBanner", () => {
  it("renders heading and portrait", () => {
    renderWithProviders(<TitleBanner />);
    expect(screen.getByText("Hi! I'm Anbang.")).toBeInTheDocument();
    expect(screen.getByText("I'm a software engineer currently living in Seattle.")).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Anbang")).toBeInTheDocument();
  });
});
