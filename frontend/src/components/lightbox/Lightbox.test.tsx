import * as React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { Lightbox } from "./Lightbox";
import { createMockPhoto } from "../../mocks/factories";

describe("Lightbox", () => {
  const photos = [
    createMockPhoto({ src: "https://example.com/1.jpg", caption: "Photo 1" }),
    createMockPhoto({ src: "https://example.com/2.jpg", caption: "Photo 2" }),
  ];

  it("renders the current photo and caption", () => {
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={jest.fn()} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    expect(screen.getByAltText("Photo 1")).toBeInTheDocument();
    expect(screen.getByText("Photo 1")).toBeInTheDocument();
  });

  it("closes on Escape key", async () => {
    const onClose = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={onClose} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onPrev on ArrowLeft", async () => {
    const onPrev = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={1} onClose={jest.fn()} onPrev={onPrev} onNext={jest.fn()} />
    );
    await userEvent.keyboard("{ArrowLeft}");
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext on ArrowRight", async () => {
    const onNext = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={jest.fn()} onPrev={jest.fn()} onNext={onNext} />
    );
    await userEvent.keyboard("{ArrowRight}");
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("closes when overlay is clicked", async () => {
    const onClose = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={onClose} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    const overlay = screen.getByRole("dialog");
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when content is clicked", async () => {
    const onClose = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={onClose} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    const img = screen.getByAltText("Photo 1");
    await userEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows counter", () => {
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={1} onClose={jest.fn()} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("hides arrows when only one photo", () => {
    renderWithProviders(
      <Lightbox photos={[photos[0]]} currentIndex={0} onClose={jest.fn()} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={onClose} onPrev={jest.fn()} onNext={jest.fn()} />
    );
    const closeBtn = screen.getByLabelText("Close");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onPrev when previous arrow is clicked", async () => {
    const onPrev = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={1} onClose={jest.fn()} onPrev={onPrev} onNext={jest.fn()} />
    );
    const prevBtn = screen.getByLabelText("Previous photo");
    await userEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next arrow is clicked", async () => {
    const onNext = jest.fn();
    renderWithProviders(
      <Lightbox photos={photos} currentIndex={0} onClose={jest.fn()} onPrev={jest.fn()} onNext={onNext} />
    );
    const nextBtn = screen.getByLabelText("Next photo");
    await userEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
