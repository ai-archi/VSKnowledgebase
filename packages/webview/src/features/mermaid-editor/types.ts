// Type definitions for Mermaid Editor

export const DEFAULT_NODE_COLORS = {
  rectangle: "#FDE68A",
  stadium: "#C4F1F9",
  circle: "#E9D8FD",
  "double-circle": "#BFDBFE",
  diamond: "#FBCFE8",
  subroutine: "#FED7AA",
  cylinder: "#BBF7D0",
  hexagon: "#FCA5A5",
  parallelogram: "#C7D2FE",
  "parallelogram-alt": "#A5F3FC",
  trapezoid: "#FCE7F3",
  "trapezoid-alt": "#FCD5CE",
  asymmetric: "#F5D0FE",
} as const;

export const DEFAULT_EDGE_COLOR = "#2d3748";
export const DEFAULT_NODE_TEXT = "#1a202c";
export const DEFAULT_NODE_STROKE = "#2d3748";

export const LINE_STYLE_OPTIONS = [
  { value: "solid", label: "实线" },
  { value: "dashed", label: "虚线" },
] as const;

export const ARROW_DIRECTION_OPTIONS = [
  { value: "forward", label: "向前" },
  { value: "backward", label: "向后" },
  { value: "both", label: "双向" },
  { value: "none", label: "无" },
] as const;

export const HEX_COLOR_RE = /^#([0-9a-f]{6})$/i;
export const PADDING_PRECISION = 1000;
export const PADDING_EPSILON = 0.001;
export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;

// Canvas constants
export const DEFAULT_NODE_WIDTH = 140;
export const DEFAULT_NODE_HEIGHT = 60;
export const NODE_LABEL_HEIGHT = 28;
export const NODE_TEXT_LINE_HEIGHT = 16;
export const LAYOUT_MARGIN = 80;
export const HANDLE_RADIUS = 6;
export const EPSILON = 0.5;
export const GRID_SIZE = 10;
export const ALIGN_THRESHOLD = 8;
export const BOUNDS_SMOOTHING = 0.18;
export const BOUNDS_EPSILON = 0.5;
export const EDGE_LABEL_MIN_WIDTH = 36;
export const EDGE_LABEL_MIN_HEIGHT = 28;
export const EDGE_LABEL_LINE_HEIGHT = 16;
export const EDGE_LABEL_FONT_SIZE = 13;
export const EDGE_LABEL_HORIZONTAL_PADDING = 16;
export const EDGE_LABEL_VERTICAL_PADDING = 12;
export const EDGE_LABEL_VERTICAL_OFFSET = 10;
export const EDGE_LABEL_BORDER_RADIUS = 6;
export const EDGE_LABEL_BACKGROUND = "white";
export const EDGE_LABEL_BACKGROUND_OPACITY = 0.96;
export const SUBGRAPH_FILL = "#edf2f7";
export const SUBGRAPH_STROKE = "#a0aec0";
export const SUBGRAPH_LABEL_COLOR = "#2d3748";
export const SUBGRAPH_BORDER_RADIUS = 16;
export const SUBGRAPH_SEPARATION = 140;

// Type definitions
export interface Node {
  id: string;
  label: string;
  shape?: string;
  style?: NodeStyle;
  overridePosition?: { x: number; y: number };
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: EdgeStyle;
  overridePoints?: Array<{ x: number; y: number }>;
}

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  arrowType?: string;
}

export interface Diagram {
  nodes: Node[];
  edges: Edge[];
}

export interface State {
  diagram: Diagram | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  source: string;
  sourceDraft: string;
  lastSavedSource: string | null; // 参考 PlantUML，跟踪已保存的内容
  sourceSaving: boolean;
  sourceError: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  imagePaddingValue: string;
  dragging: boolean;
}

export type StateListener = (state: State) => void;
export type Unsubscribe = () => void;

