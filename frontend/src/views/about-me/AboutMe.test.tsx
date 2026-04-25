import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { AboutMe } from "./AboutMe";

describe("AboutMe", () => {
  it("renders heading and portrait", () => {
    renderWithProviders(<AboutMe />);
    expect(screen.getByText("Hi! I'm Anbang.")).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Anbang")).toBeInTheDocument();
  });
});
