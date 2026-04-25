import * as React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils";
import { ContactMe } from "./ContactMe";

describe("ContactMe", () => {
  it("renders heading and mailto link", () => {
    renderWithProviders(<ContactMe />);
    expect(screen.getByText("Contact Me")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /anbangzhang21@gmail.com/i });
    expect(link).toHaveAttribute("href", "mailto:anbangzhang21@gmail.com");
  });
});
