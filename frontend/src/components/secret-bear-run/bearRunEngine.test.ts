import {
  createInitialBearRunState,
  endBearJump,
  MAX_JUMP_HOLD_SECONDS,
  startBearJump,
  updateBearRunState,
  type BearRunState,
} from "./bearRunEngine";

const FRAME_SECONDS = 1 / 60;
const RANDOM_VALUE = 0.5;

const simulateJumpApex = (releaseAfterSeconds: number): number => {
  let state = startBearJump(createInitialBearRunState());
  let elapsedSeconds = 0;
  let apexY = state.bearY;
  let hasReleased = false;

  for (let frame = 0; frame < 240; frame += 1) {
    if (!hasReleased && elapsedSeconds >= releaseAfterSeconds) {
      state = endBearJump(state);
      hasReleased = true;
    }

    state = updateBearRunState(state, FRAME_SECONDS, RANDOM_VALUE);
    elapsedSeconds += FRAME_SECONDS;
    apexY = Math.min(apexY, state.bearY);

    if (frame > 0 && state.isGrounded) {
      return apexY;
    }
  }

  throw new Error("Jump did not land within the simulated frame budget");
};

const advanceState = (state: BearRunState, frameCount: number): BearRunState => {
  let nextState = state;

  for (let frame = 0; frame < frameCount; frame += 1) {
    nextState = updateBearRunState(nextState, FRAME_SECONDS, RANDOM_VALUE);
  }

  return nextState;
};

describe("bearRunEngine variable jump", () => {
  it("makes a short press lower than a held jump", () => {
    const shortPressApex = simulateJumpApex(0);
    const heldApex = simulateJumpApex(1);

    expect(shortPressApex).toBeGreaterThan(heldApex + 20);
  });

  it("keeps a full hold close to the previous long-jump height", () => {
    const heldApex = simulateJumpApex(1);

    expect(heldApex).toBeGreaterThanOrEqual(60);
    expect(heldApex).toBeLessThanOrEqual(78);
  });

  it("stops adding lift after the max hold window", () => {
    const cappedHoldApex = simulateJumpApex(MAX_JUMP_HOLD_SECONDS);
    const overHeldApex = simulateJumpApex(MAX_JUMP_HOLD_SECONDS + 1);

    expect(overHeldApex).toBeGreaterThanOrEqual(cappedHoldApex - 1);
  });

  it("stops adding lift when input is released early", () => {
    const earlyReleaseApex = simulateJumpApex(FRAME_SECONDS * 2);
    const heldApex = simulateJumpApex(1);

    expect(earlyReleaseApex).toBeGreaterThan(heldApex + 12);
  });

  it("does not start a second jump while airborne", () => {
    const airborneState = advanceState(startBearJump(createInitialBearRunState()), 4);
    const attemptedSecondJump = startBearJump(airborneState);

    expect(attemptedSecondJump).toEqual(airborneState);
  });
});
