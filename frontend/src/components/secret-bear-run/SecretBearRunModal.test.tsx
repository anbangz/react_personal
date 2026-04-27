import * as React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { SecretBearRunModal } from "./SecretBearRunModal";
import { endBearJump, hasBearCollision, startBearJump } from "./bearRunEngine";

jest.mock("./bearRunSprites", () => ({
  drawBearSprite: jest.fn(),
  drawLogObstacle: jest.fn(),
  drawStageBackground: jest.fn(),
  drawTreeObstacle: jest.fn(),
}));

jest.mock("./bearRunEngine", () => {
  const actual = jest.requireActual<typeof import("./bearRunEngine")>("./bearRunEngine");

  return {
    ...actual,
    endBearJump: jest.fn(actual.endBearJump),
    startBearJump: jest.fn(actual.startBearJump),
    updateBearRunState: jest.fn(actual.updateBearRunState),
    hasBearCollision: jest.fn(() => false),
  };
});

const mockedStartBearJump = jest.mocked(startBearJump);
const mockedEndBearJump = jest.mocked(endBearJump);
const mockedHasBearCollision = jest.mocked(hasBearCollision);

const renderOpenModal = () => {
  const triggerButtonRef = React.createRef<HTMLButtonElement>();
  const onClose = jest.fn();

  renderWithProviders(
    <SecretBearRunModal isOpen={true} onClose={onClose} triggerButtonRef={triggerButtonRef} />
  );

  return { onClose };
};

const getStage = (): HTMLElement => {
  const stage = screen.getByLabelText("Secret Bear Run playfield").parentElement;

  if (!stage) {
    throw new Error("Expected playfield to have a stage parent");
  }

  return stage;
};

const dispatchPointerEvent = (element: HTMLElement, type: string, pointerId: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "pointerId", { value: pointerId });

  fireEvent(element, event);
};

describe("SecretBearRunModal jump input", () => {
  let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;
  let cancelAnimationFrameSpy: jest.SpyInstance<void, [number]>;
  let getContextSpy: jest.SpyInstance<RenderingContext | null, [contextId: string, options?: unknown]>;

  beforeEach(() => {
    requestAnimationFrameSpy = jest.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    cancelAnimationFrameSpy = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    mockedStartBearJump.mockImplementation((state) => ({
      ...state,
      isGrounded: false,
      isJumpHeld: true,
    }));
    mockedEndBearJump.mockImplementation((state) => ({
      ...state,
      isJumpHeld: false,
    }));
    mockedHasBearCollision.mockReturnValue(false);
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    getContextSpy.mockRestore();
  });

  it("clears active jump keys on window blur so Space can start another jump without keyup", async () => {
    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");

    fireEvent.keyDown(document.body, { key: " " });
    expect(mockedStartBearJump).toHaveBeenCalledTimes(1);

    fireEvent.blur(window);
    expect(mockedEndBearJump).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document.body, { key: " " });
    expect(mockedStartBearJump).toHaveBeenCalledTimes(2);
  });

  it("only ends a pointer-held jump for the original pointer", async () => {
    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");
    const stage = getStage();

    dispatchPointerEvent(stage, "pointerdown", 7);
    expect(mockedStartBearJump).toHaveBeenCalledTimes(1);

    dispatchPointerEvent(stage, "pointerup", 11);
    expect(mockedEndBearJump).not.toHaveBeenCalled();

    dispatchPointerEvent(stage, "pointerup", 7);
    expect(mockedEndBearJump).toHaveBeenCalledTimes(1);
  });

  it("uses the full dialog as a jump target while playing", async () => {
    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");
    const dialog = screen.getByRole("dialog", { name: /easter egg/i });

    dispatchPointerEvent(dialog, "pointerdown", 7);
    expect(mockedStartBearJump).toHaveBeenCalledTimes(1);

    dispatchPointerEvent(dialog, "pointerup", 7);
    expect(mockedEndBearJump).toHaveBeenCalledTimes(1);
  });

  it("does not start a jump from pointer events on dialog controls", async () => {
    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");
    const closeButton = screen.getByRole("button", { name: /close secret bear run/i });

    dispatchPointerEvent(closeButton, "pointerdown", 7);

    expect(mockedStartBearJump).not.toHaveBeenCalled();
  });

  it("keeps dialog controls clickable while playing", async () => {
    const { onClose } = renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");

    await userEvent.click(screen.getByRole("button", { name: /close secret bear run/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedStartBearJump).not.toHaveBeenCalled();
  });

  it("removes the full-dialog touch lock after game over", async () => {
    const animationFrameCallbacks: FrameRequestCallback[] = [];
    requestAnimationFrameSpy.mockImplementation((callback) => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    });
    mockedHasBearCollision.mockReturnValue(true);

    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    const dialog = screen.getByRole("dialog", { name: /easter egg/i });
    expect(dialog).toHaveClass("secret-bear-run__dialog--game-active");

    act(() => {
      animationFrameCallbacks.pop()?.(1000);
    });

    await screen.findByRole("button", { name: /run again/i });
    expect(dialog).not.toHaveClass("secret-bear-run__dialog--game-active");
  });

  it("does not restart from a held Space key after game over focuses Run again", async () => {
    const animationFrameCallbacks: FrameRequestCallback[] = [];
    requestAnimationFrameSpy.mockImplementation((callback) => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    });
    mockedHasBearCollision.mockReturnValue(true);

    renderOpenModal();
    await userEvent.click(screen.getByRole("button", { name: /start run/i }));
    await screen.findByLabelText("Secret Bear Run playfield");

    fireEvent.keyDown(document.body, { key: " " });

    act(() => {
      animationFrameCallbacks.pop()?.(1000);
    });

    const runAgainButton = await screen.findByRole("button", { name: /run again/i });

    act(() => {
      animationFrameCallbacks.pop()?.(1016);
    });

    await waitFor(() => expect(runAgainButton).toHaveFocus());

    await userEvent.keyboard("[Space]");

    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Secret Bear Run playfield")).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(screen.getByRole("button", { name: /run again/i }));

    expect(screen.queryByRole("button", { name: /run again/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Secret Bear Run playfield")).not.toHaveAttribute("aria-hidden");
  });
});
