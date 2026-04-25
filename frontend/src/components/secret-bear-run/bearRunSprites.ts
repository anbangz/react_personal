import { CANVAS_HEIGHT, CANVAS_WIDTH, GROUND_Y } from "./bearRunEngine";
import BearImg from "../../static/images/bear.png";

const SKY_COLOR = "#b9dcff";
const HORIZON_COLOR = "#d8eefc";
const GROUND_COLOR = "#b6d37b";
const DIRT_COLOR = "#81653b";
const PINE_DARK = "#275639";
const PINE_LIGHT = "#4f8654";
const LOG_BARK = "#7b5537";
const LOG_RING = "#d9b483";

// Load the bear image once and reuse it
const bearImage = new Image();
bearImage.src = BearImg;

type PixelGrid = readonly string[];

const PIXEL_SCALE = 2;

const TREE_SPRITE: PixelGrid = [
  ".....3.....",
  "....333....",
  "...33333...",
  "..3333333..",
  "...33333...",
  "..3333333..",
  ".333333333.",
  "..3333333..",
  ".333333333.",
  "33333333333",
  "....222....",
  "....222....",
];

const LOG_SPRITE: PixelGrid = [
  "122222222221",
  "233333333332",
  "233333333332",
  "122222222221",
  ".1111111111.",
];

const TREE_COLOR_MAP: Record<string, string> = {
  "2": DIRT_COLOR,
  "3": PINE_DARK,
};

const LOG_COLOR_MAP: Record<string, string> = {
  "1": LOG_RING,
  "2": LOG_BARK,
  "3": DIRT_COLOR,
};

const drawPixelGrid = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixelGrid: PixelGrid,
  colorMap: Record<string, string>
): void => {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);

  pixelGrid.forEach((row, rowIndex) => {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const pixel = row[columnIndex];
      if (pixel === ".") {
        continue;
      }

      const color = colorMap[pixel];
      if (!color) {
        continue;
      }

      context.fillStyle = color;
      context.fillRect(
        roundedX + columnIndex * PIXEL_SCALE,
        roundedY + rowIndex * PIXEL_SCALE,
        PIXEL_SCALE,
        PIXEL_SCALE
      );
    }
  });
};

export const drawStageBackground = (context: CanvasRenderingContext2D): void => {
  context.save();
  context.imageSmoothingEnabled = false;

  context.fillStyle = SKY_COLOR;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = HORIZON_COLOR;
  context.fillRect(0, 104, CANVAS_WIDTH, 32);

  context.fillStyle = GROUND_COLOR;
  context.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  context.fillStyle = DIRT_COLOR;
  context.fillRect(0, GROUND_Y + 18, CANVAS_WIDTH, CANVAS_HEIGHT - (GROUND_Y + 18));

  context.strokeStyle = "rgba(52, 88, 126, 0.25)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, GROUND_Y + 0.5);
  context.lineTo(CANVAS_WIDTH, GROUND_Y + 0.5);
  context.stroke();

  context.restore();
};

export const drawBearSprite = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  _isJumping: boolean,
  _animationTick: number
): void => {
  if (!bearImage.complete || bearImage.naturalWidth === 0) {
    return;
  }

  context.save();
  context.imageSmoothingEnabled = false;

  // The original image faces LEFT; flip horizontally to face RIGHT
  // Preserve the image aspect ratio (282:209 ≈ 1.35:1)
  // Drawn at 75% of previous size (48x36) with reduced hitbox (28x20)
  const BEAR_DRAW_WIDTH = 48;
  const BEAR_DRAW_HEIGHT = Math.round(BEAR_DRAW_WIDTH / (282 / 209)); // ≈ 36

  // Center the image vertically so the feet align with the collision box bottom.
  const DRAW_OFFSET_Y = BEAR_DRAW_HEIGHT - 20;

  context.translate(x + BEAR_DRAW_WIDTH / 2, y - DRAW_OFFSET_Y + BEAR_DRAW_HEIGHT / 2);
  context.scale(-1, 1); // Flip horizontally
  context.drawImage(
    bearImage,
    -BEAR_DRAW_WIDTH / 2,
    -BEAR_DRAW_HEIGHT / 2,
    BEAR_DRAW_WIDTH,
    BEAR_DRAW_HEIGHT
  );

  context.restore();
};

export const drawTreeObstacle = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  context.save();
  context.imageSmoothingEnabled = false;
  drawPixelGrid(context, x, y, TREE_SPRITE, TREE_COLOR_MAP);
  context.fillStyle = PINE_LIGHT;
  context.fillRect(x + 6, y + 8, 8, 2);
  context.fillRect(x + 4, y + 14, 12, 2);
  context.restore();
};

export const drawLogObstacle = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  context.save();
  context.imageSmoothingEnabled = false;
  drawPixelGrid(context, x, y, LOG_SPRITE, LOG_COLOR_MAP);
  context.fillStyle = LOG_BARK;
  context.fillRect(x + 4, y + 2, 16, 2);
  context.restore();
};
