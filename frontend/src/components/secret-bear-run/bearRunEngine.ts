export type BearRunObstacleKind = "log" | "tree";

export interface BearRunObstacle {
  kind: BearRunObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BearRunState {
  bearY: number;
  bearVelocityY: number;
  isGrounded: boolean;
  speed: number;
  score: number;
  distanceUntilNextObstacle: number;
  obstacles: BearRunObstacle[];
}

export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 240;
export const GROUND_Y = 184;
export const BEAR_X = 92;
export const BEAR_WIDTH = 28;
export const BEAR_HEIGHT = 20;

const GRAVITY = 1400;
const JUMP_VELOCITY = -520;
const START_SPEED = 220;
const MAX_SPEED = 420;
const SPEED_ACCELERATION = 8;
const SCORE_RATE = 18;
const OBSTACLE_SPAWN_X = CANVAS_WIDTH + 20;
const MIN_OBSTACLE_GAP = 220;
const MAX_OBSTACLE_GAP = 380;
const LOG_WIDTH = 24;
const LOG_HEIGHT = 10;
const TREE_WIDTH = 22;
const TREE_HEIGHT = 24;

const getBearGroundTop = (): number => GROUND_Y - BEAR_HEIGHT;

const getObstacleDimensions = (kind: BearRunObstacleKind): Pick<BearRunObstacle, "width" | "height" | "y"> => {
  if (kind === "tree") {
    return {
      width: TREE_WIDTH,
      height: TREE_HEIGHT,
      y: GROUND_Y - TREE_HEIGHT,
    };
  }

  return {
    width: LOG_WIDTH,
    height: LOG_HEIGHT,
    y: GROUND_Y - LOG_HEIGHT,
  };
};

const createObstacle = (randomValue: number): BearRunObstacle => {
  const kind: BearRunObstacleKind = randomValue < 0.55 ? "log" : "tree";
  const dimensions = getObstacleDimensions(kind);

  return {
    kind,
    x: OBSTACLE_SPAWN_X,
    ...dimensions,
  };
};

const createObstacleGap = (randomValue: number): number =>
  MIN_OBSTACLE_GAP + (MAX_OBSTACLE_GAP - MIN_OBSTACLE_GAP) * randomValue;

export const createInitialBearRunState = (): BearRunState => ({
  bearY: getBearGroundTop(),
  bearVelocityY: 0,
  isGrounded: true,
  speed: START_SPEED,
  score: 0,
  distanceUntilNextObstacle: MIN_OBSTACLE_GAP,
  obstacles: [],
});

export const jumpBear = (state: BearRunState): BearRunState => {
  if (!state.isGrounded) {
    return state;
  }

  return {
    ...state,
    isGrounded: false,
    bearVelocityY: JUMP_VELOCITY,
  };
};

export const updateBearRunState = (
  state: BearRunState,
  deltaSeconds: number,
  randomValue: number
): BearRunState => {
  if (deltaSeconds <= 0) {
    return state;
  }

  const boundedRandomValue = Math.max(0, Math.min(1, randomValue));
  const nextSpeed = Math.min(MAX_SPEED, state.speed + SPEED_ACCELERATION * deltaSeconds);
  const nextScore = state.score + SCORE_RATE * deltaSeconds;
  let nextBearVelocityY = state.bearVelocityY + GRAVITY * deltaSeconds;
  let nextBearY = state.bearY + nextBearVelocityY * deltaSeconds;
  let nextIsGrounded = false;
  const bearGroundTop = getBearGroundTop();

  if (nextBearY >= bearGroundTop) {
    nextBearY = bearGroundTop;
    nextBearVelocityY = 0;
    nextIsGrounded = true;
  }

  let nextDistanceUntilNextObstacle = state.distanceUntilNextObstacle - nextSpeed * deltaSeconds;
  const nextObstacles = state.obstacles
    .map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - nextSpeed * deltaSeconds,
    }))
    .filter((obstacle) => obstacle.x + obstacle.width > 0);

  if (nextDistanceUntilNextObstacle <= 0) {
    nextObstacles.push(createObstacle(boundedRandomValue));
    nextDistanceUntilNextObstacle += createObstacleGap(boundedRandomValue);
  }

  return {
    bearY: nextBearY,
    bearVelocityY: nextBearVelocityY,
    isGrounded: nextIsGrounded,
    speed: nextSpeed,
    score: nextScore,
    distanceUntilNextObstacle: nextDistanceUntilNextObstacle,
    obstacles: nextObstacles,
  };
};

export const hasBearCollision = (state: BearRunState): boolean => {
  const bearTop = state.bearY;
  const bearBottom = bearTop + BEAR_HEIGHT;
  const bearLeft = BEAR_X;
  const bearRight = bearLeft + BEAR_WIDTH;

  return state.obstacles.some((obstacle) => {
    const obstacleTop = obstacle.y;
    const obstacleBottom = obstacle.y + obstacle.height;
    const obstacleLeft = obstacle.x;
    const obstacleRight = obstacleLeft + obstacle.width;

    return (
      bearLeft < obstacleRight &&
      bearRight > obstacleLeft &&
      bearTop < obstacleBottom &&
      bearBottom > obstacleTop
    );
  });
};
