import * as React from "react";

import {
  BEAR_X,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createInitialBearRunState,
  endBearJump,
  hasBearCollision,
  startBearJump,
  updateBearRunState,
  type BearRunState,
} from "./bearRunEngine";
import {
  drawBearSprite,
  drawLogObstacle,
  drawStageBackground,
  drawTreeObstacle,
} from "./bearRunSprites";
import "./SecretBearRunModal.css";

const BEST_SCORE_STORAGE_KEY = "secret-bear-run-best-score";
const INTERACTIVE_JUMP_BLOCK_SELECTOR = 'button, input, select, textarea, a[href], [contenteditable="true"], [contenteditable=""], [contenteditable]';

type SecretBearRunScreen = "intro" | "playing" | "game-over";

const isInteractiveJumpTarget = (target: EventTarget | null): boolean => (
  target instanceof Element && target.closest(INTERACTIVE_JUMP_BLOCK_SELECTOR) !== null
);

export interface SecretBearRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export const SecretBearRunModal: React.FunctionComponent<SecretBearRunModalProps> = ({
  isOpen,
  onClose,
  triggerButtonRef,
}) => {
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const runAgainButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const previousFrameTimeRef = React.useRef<number | null>(null);
  const bearRunStateRef = React.useRef<BearRunState>(createInitialBearRunState());
  const animationTickRef = React.useRef(0);
  const currentScreenRef = React.useRef<SecretBearRunScreen>("intro");
  const scoreRef = React.useRef(0);
  const bestScoreRef = React.useRef(0);
  const activeJumpKeysRef = React.useRef<Set<string>>(new Set());
  const suppressedGameOverJumpKeysRef = React.useRef<Set<string>>(new Set());
  const activeJumpPointerIdRef = React.useRef<number | null>(null);
  const [screen, setScreen] = React.useState<SecretBearRunScreen>("intro");
  const [score, setScore] = React.useState(0);
  const [bestScore, setBestScore] = React.useState(0);

  const stopAnimationLoop = React.useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    previousFrameTimeRef.current = null;
  }, []);

  const drawFrame = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const currentState = bearRunStateRef.current;
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.imageSmoothingEnabled = false;

    drawStageBackground(context);

    currentState.obstacles.forEach((obstacle) => {
      if (obstacle.kind === "tree") {
        drawTreeObstacle(context, obstacle.x, obstacle.y);
        return;
      }

      drawLogObstacle(context, obstacle.x, obstacle.y);
    });

    drawBearSprite(context, BEAR_X, currentState.bearY, !currentState.isGrounded, animationTickRef.current);
  }, []);

  const finishRun = React.useCallback(() => {
    stopAnimationLoop();
    suppressedGameOverJumpKeysRef.current = new Set(activeJumpKeysRef.current);
    activeJumpKeysRef.current.clear();
    activeJumpPointerIdRef.current = null;
    currentScreenRef.current = "game-over";
    setScreen("game-over");

    const finalScore = Math.floor(bearRunStateRef.current.score);
    scoreRef.current = finalScore;
    setScore(finalScore);

    if (finalScore <= bestScoreRef.current) {
      return;
    }

    bestScoreRef.current = finalScore;
    setBestScore(finalScore);

    try {
      window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(finalScore));
    } catch {
      // Ignore localStorage failures so the game can still end cleanly.
    }
  }, [stopAnimationLoop]);

  const handleJumpStart = React.useCallback(() => {
    if (currentScreenRef.current !== "playing") {
      return;
    }

    bearRunStateRef.current = startBearJump(bearRunStateRef.current);
    drawFrame();
  }, [drawFrame]);

  const handleJumpEnd = React.useCallback(() => {
    if (currentScreenRef.current !== "playing") {
      return;
    }

    bearRunStateRef.current = endBearJump(bearRunStateRef.current);
  }, []);

  const clearActiveJumpInput = React.useCallback(() => {
    activeJumpKeysRef.current.clear();
    activeJumpPointerIdRef.current = null;

    if (currentScreenRef.current === "playing") {
      handleJumpEnd();
    }
  }, [handleJumpEnd]);

  const handleStagePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (currentScreenRef.current !== "playing") {
        return;
      }

      if (isInteractiveJumpTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (activeJumpPointerIdRef.current !== null) {
        return;
      }

      activeJumpPointerIdRef.current = event.pointerId;

      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      handleJumpStart();
    },
    [handleJumpStart]
  );

  const handleStagePointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (currentScreenRef.current !== "playing") {
        return;
      }

      if (activeJumpPointerIdRef.current === null && isInteractiveJumpTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (activeJumpPointerIdRef.current !== event.pointerId) {
        return;
      }

      activeJumpPointerIdRef.current = null;

      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        typeof event.currentTarget.releasePointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (activeJumpKeysRef.current.size === 0) {
        handleJumpEnd();
      }
    },
    [handleJumpEnd]
  );

  const startRun = React.useCallback(() => {
    stopAnimationLoop();
    bearRunStateRef.current = createInitialBearRunState();
    animationTickRef.current = 0;
    previousFrameTimeRef.current = null;
    activeJumpKeysRef.current.clear();
    suppressedGameOverJumpKeysRef.current.clear();
    activeJumpPointerIdRef.current = null;
    currentScreenRef.current = "playing";
    scoreRef.current = 0;
    setScore(0);
    setScreen("playing");
  }, [stopAnimationLoop]);

  const handleClose = React.useCallback(() => {
    stopAnimationLoop();
    activeJumpKeysRef.current.clear();
    suppressedGameOverJumpKeysRef.current.clear();
    activeJumpPointerIdRef.current = null;
    onClose();
  }, [onClose, stopAnimationLoop]);

  React.useEffect(() => {
    currentScreenRef.current = screen;

    if (screen === "game-over") {
      window.requestAnimationFrame(() => runAgainButtonRef.current?.focus());
    }
  }, [screen]);

  React.useEffect(() => {
    if (!isOpen) {
      stopAnimationLoop();
      return;
    }

    bearRunStateRef.current = createInitialBearRunState();
    animationTickRef.current = 0;
    previousFrameTimeRef.current = null;
    activeJumpKeysRef.current.clear();
    suppressedGameOverJumpKeysRef.current.clear();
    activeJumpPointerIdRef.current = null;
    currentScreenRef.current = "intro";
    setScreen("intro");
    scoreRef.current = 0;
    setScore(0);

    try {
      const storedBestScore = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      const parsedBestScore = storedBestScore ? Number.parseInt(storedBestScore, 10) : 0;
      const resolvedBestScore = Number.isFinite(parsedBestScore) ? parsedBestScore : 0;
      bestScoreRef.current = resolvedBestScore;
      setBestScore(resolvedBestScore);
    } catch {
      bestScoreRef.current = 0;
      setBestScore(0);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const getJumpKey = (key: string): "Space" | "ArrowUp" | null => {
      if (key === " " || key === "Space" || key === "Spacebar") {
        return "Space";
      }

      if (key === "ArrowUp") {
        return "ArrowUp";
      }

      return null;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      const eventTarget = event.target instanceof Element ? event.target : null;
      const jumpKey = getJumpKey(event.key);
      const isInteractiveTarget = eventTarget?.closest(INTERACTIVE_JUMP_BLOCK_SELECTOR) !== null;

      if (
        currentScreenRef.current === "game-over" &&
        jumpKey !== null &&
        suppressedGameOverJumpKeysRef.current.has(jumpKey)
      ) {
        event.preventDefault();
        return;
      }

      if (currentScreenRef.current === "playing" && jumpKey !== null && !isInteractiveTarget) {
        event.preventDefault();

        if (!event.repeat && !activeJumpKeysRef.current.has(jumpKey)) {
          activeJumpKeysRef.current.add(jumpKey);
          handleJumpStart();
        }

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const jumpKey = getJumpKey(event.key);

      if (jumpKey === null) {
        return;
      }

      if (suppressedGameOverJumpKeysRef.current.has(jumpKey)) {
        event.preventDefault();
        suppressedGameOverJumpKeysRef.current.delete(jumpKey);
        activeJumpKeysRef.current.delete(jumpKey);
        return;
      }

      activeJumpKeysRef.current.delete(jumpKey);

      if (
        currentScreenRef.current === "playing" &&
        activeJumpPointerIdRef.current === null &&
        activeJumpKeysRef.current.size === 0
      ) {
        event.preventDefault();
        handleJumpEnd();
      }
    };

    const handleWindowBlur = () => {
      clearActiveJumpInput();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearActiveJumpInput();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimationLoop();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      triggerButtonRef.current?.focus();
    };
  }, [clearActiveJumpInput, handleClose, handleJumpEnd, handleJumpStart, isOpen, stopAnimationLoop, triggerButtonRef]);

  React.useEffect(() => {
    if (!isOpen || screen !== "playing") {
      return;
    }

    drawFrame();

    const tick = (timestamp: number) => {
      const previousTimestamp = previousFrameTimeRef.current ?? timestamp;
      previousFrameTimeRef.current = timestamp;

      const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.05);
      const nextState = updateBearRunState(bearRunStateRef.current, deltaSeconds, Math.random());
      bearRunStateRef.current = nextState;

      const nextScore = Math.floor(nextState.score);
      if (nextScore !== scoreRef.current) {
        scoreRef.current = nextScore;
        setScore(nextScore);
      }

      animationTickRef.current += deltaSeconds * 12;
      drawFrame();

      if (hasBearCollision(nextState)) {
        finishRun();
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      stopAnimationLoop();
    };
  }, [drawFrame, finishRun, isOpen, screen, stopAnimationLoop]);

  if (!isOpen) {
    return null;
  }

  const descriptionId =
    screen === "intro"
      ? "secret-bear-run-intro-hint"
      : screen === "game-over"
        ? "secret-bear-run-game-over-hint"
        : undefined;
  const dialogClassName = [
    "secret-bear-run__dialog",
    screen === "playing" ? "secret-bear-run__dialog--game-active" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="secret-bear-run" role="presentation" onClick={handleClose}>
      <div
        ref={dialogRef}
        className={dialogClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-bear-run-title"
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerEnd}
        onPointerCancel={handleStagePointerEnd}
        onPointerLeave={handleStagePointerEnd}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="secret-bear-run__close"
          aria-label="Close Secret Bear Run"
          onClick={handleClose}
        >
          &#x2715;
        </button>
        <div className="secret-bear-run__header">
          <h2 id="secret-bear-run-title">Easter Egg: Bear Run Minigame</h2>
          <div className="secret-bear-run__scoreboard" aria-label="Scoreboard">
            <p className="secret-bear-run__score-item">Score: {score}</p>
            <p className="secret-bear-run__score-item">Best: {bestScore}</p>
          </div>
        </div>

        {screen === "intro" && (
          <div className="secret-bear-run__panel">
            <p id="secret-bear-run-intro-hint" className="secret-bear-run__hint">
              Press Space or the Up Arrow, or tap the game, to jump. Hold longer for a higher jump over logs and pine trees.
            </p>
            <button type="button" className="button is-link secret-bear-run__primary-action" onClick={startRun}>
              Start run
            </button>
          </div>
        )}

        {(screen === "playing" || screen === "game-over") && (
          <div className="secret-bear-run__play-area">
            <div className="secret-bear-run__stage">
              <canvas
                ref={canvasRef}
                className="secret-bear-run__canvas"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                aria-label="Secret Bear Run playfield"
                aria-hidden={screen === "game-over" ? "true" : undefined}
              />
              {screen === "game-over" && (
                <div className="secret-bear-run__overlay" role="status" aria-live="polite">
                  <p id="secret-bear-run-game-over-hint" className="secret-bear-run__overlay-text">
                    The forest won that round.
                  </p>
                  <button
                    ref={runAgainButtonRef}
                    type="button"
                    className="button is-link secret-bear-run__primary-action"
                    onClick={startRun}
                  >
                    Run again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
