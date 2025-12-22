// Utility functions

export function formatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = unitIndex === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode image."));
        return;
      }
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Failed to encode image."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to encode image."));
    };
    reader.readAsDataURL(blob);
  });
}

export function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image file."));
    };
    image.src = url;
  });
}

export async function resizeImageToLimit(image, sourceBlob, maxBytes) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas support is required to resize images.");
  }

  if (sourceBlob.size <= maxBytes) {
    return { blob: sourceBlob, resized: false, fits: true };
  }

  const MIN_SCALE = 0.05;
  const STEP = 0.75;

  let currentScale = Math.sqrt(maxBytes / sourceBlob.size);
  if (!Number.isFinite(currentScale) || currentScale >= 0.99) {
    currentScale = 0.95;
  }
  currentScale = Math.min(currentScale, 0.95);
  currentScale = Math.max(currentScale, MIN_SCALE);

  let blob = null;
  let fits = false;
  let attempts = 0;

  while (attempts < 10 && currentScale >= MIN_SCALE) {
    const targetWidth = Math.max(1, Math.round(image.width * currentScale));
    const targetHeight = Math.max(1, Math.round(image.height * currentScale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
      throw new Error("Failed to encode resized image.");
    }

    if (blob.size <= maxBytes) {
      fits = true;
      break;
    }

    currentScale *= STEP;
    attempts += 1;
  }

  if (!blob) {
    throw new Error("Failed to process image.");
  }

  return { blob, resized: true, fits };
}

export async function ensureImageWithinLimit(file, maxBytes) {
  if (file.size <= maxBytes) {
    const base64 = await blobToBase64(file);
    return {
      base64,
      resized: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  const image = await loadImageFromBlob(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    throw new Error("Unable to read image dimensions.");
  }

  const { blob, fits } = await resizeImageToLimit(image, file, maxBytes);

  if (!fits || blob.size > maxBytes) {
    throw new Error(
      `Image is too large to upload. Please use an image smaller than ${formatByteSize(
        maxBytes
      )}.`
    );
  }

  const base64 = await blobToBase64(blob);
  return {
    base64,
    resized: true,
    originalSize: file.size,
    finalSize: blob.size,
  };
}

export function formatPaddingValue(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const rounded = Math.round(value * 1000) / 1000;
  const fixed = rounded.toFixed(3);
  const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return trimmed;
}

export function normalizePadding(value) {
  if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) {
    return 0;
  }
  const clamped = Math.max(0, value);
  return Math.round(clamped * 1000) / 1000;
}

export function resolveColor(value, fallback) {
  const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;
  const base = value ?? fallback;
  if (HEX_COLOR_RE.test(base)) {
    return base.toLowerCase();
  }
  if (HEX_COLOR_RE.test(fallback)) {
    return fallback.toLowerCase();
  }
  return "#000000";
}

export function normalizeColorInput(value) {
  return value.trim().toLowerCase();
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function isClose(a, b, epsilon = 0.5) {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

export function centroid(points) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

export function distanceToSegment(point, start, end) {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const lengthSquared = vx * vx + vy * vy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  let t = (wx * vx + wy * vy) / lengthSquared;
  if (t < 0) {
    t = 0;
  } else if (t > 1) {
    t = 1;
  }

  const projectionX = start.x + t * vx;
  const projectionY = start.y + t * vy;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

export function normalizeLabelLines(label) {
  return label
    .split("\n")
    .map((line) => (line.length === 0 ? "\u00A0" : line));
}

export function measureLabelBox(lines) {
  const EDGE_LABEL_MIN_WIDTH = 36;
  const EDGE_LABEL_HORIZONTAL_PADDING = 16;
  const EDGE_LABEL_MIN_HEIGHT = 28;
  const EDGE_LABEL_LINE_HEIGHT = 16;
  const EDGE_LABEL_VERTICAL_PADDING = 12;

  let maxChars = 0;
  for (const line of lines) {
    maxChars = Math.max(maxChars, line.length);
  }

  const width = Math.max(
    EDGE_LABEL_MIN_WIDTH,
    7.4 * maxChars + EDGE_LABEL_HORIZONTAL_PADDING
  );
  const height = Math.max(
    EDGE_LABEL_MIN_HEIGHT,
    EDGE_LABEL_LINE_HEIGHT * lines.length + EDGE_LABEL_VERTICAL_PADDING
  );

  return { width, height };
}

export function snapToGrid(value, gridSize = 10) {
  if (gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

export function svgSafeId(prefix, id) {
  return `${prefix}${id.replace(/[^a-zA-Z0-9_:-]/g, "_")}`;
}

export function polygonPoints(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

