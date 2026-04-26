import * as React from "react";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils";
import { SecretBearRunModal } from "./SecretBearRunModal";
import { endBearJump, startBearJump } from "./bearRunEngine";

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

const renderOpenModal = () => {
  const triggerButtonRef = React.createRef<HTMLButtonElement>();
  const onClose = jest.fn();

  renderWithProviders(
    <SecretBearRunModal isOpen={true} onClose={onClose} triggerButtonRef={triggerButtonRef} />
  );
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
});
