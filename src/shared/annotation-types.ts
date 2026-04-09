export type AnnotationTool =
  | 'pointer'
  | 'freehand'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'eraser';

interface BaseAnnotation {
  id: string;
  color: string;
  strokeWidth: number;
}

export interface RectAnnotation extends BaseAnnotation {
  tool: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseAnnotation extends BaseAnnotation {
  tool: 'ellipse';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface FreehandAnnotation extends BaseAnnotation {
  tool: 'freehand';
  points: number[];
}

export interface ArrowAnnotation extends BaseAnnotation {
  tool: 'arrow';
  points: [number, number, number, number];
}

export interface TextAnnotation extends BaseAnnotation {
  tool: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type Annotation =
  | RectAnnotation
  | EllipseAnnotation
  | FreehandAnnotation
  | ArrowAnnotation
  | TextAnnotation;

export const DEFAULT_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#22c55e',
  '#3b82f6',
] as const;

export const DEFAULT_STROKE_WIDTHS = [1, 2, 4, 6, 8] as const;

export const DEFAULT_COLOR = '#ef4444';
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_FONT_SIZE = 16;
