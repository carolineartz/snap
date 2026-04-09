import { useReducer } from 'react';
import type { Annotation, AnnotationTool } from '../../shared/annotation-types';
import {
  DEFAULT_COLOR,
  DEFAULT_STROKE_WIDTH,
} from '../../shared/annotation-types';

interface AnnotationState {
  annotations: Annotation[];
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  drawingAnnotation: Annotation | null;
}

type AnnotationAction =
  | { type: 'SET_TOOL'; tool: AnnotationTool }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_STROKE'; width: number }
  | { type: 'START_DRAWING'; annotation: Annotation }
  | { type: 'UPDATE_DRAWING'; annotation: Annotation }
  | { type: 'FINISH_DRAWING' }
  | { type: 'REMOVE'; id: string }
  | { type: 'LOAD'; annotations: Annotation[] }
  | { type: 'CLEAR' };

const initialState: AnnotationState = {
  annotations: [],
  activeTool: 'pointer',
  activeColor: DEFAULT_COLOR,
  activeStrokeWidth: DEFAULT_STROKE_WIDTH,
  drawingAnnotation: null,
};

function reducer(
  state: AnnotationState,
  action: AnnotationAction,
): AnnotationState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };
    case 'SET_COLOR':
      return { ...state, activeColor: action.color };
    case 'SET_STROKE':
      return { ...state, activeStrokeWidth: action.width };
    case 'START_DRAWING':
      return { ...state, drawingAnnotation: action.annotation };
    case 'UPDATE_DRAWING':
      return { ...state, drawingAnnotation: action.annotation };
    case 'FINISH_DRAWING':
      if (!state.drawingAnnotation) return state;
      return {
        ...state,
        annotations: [...state.annotations, state.drawingAnnotation],
        drawingAnnotation: null,
      };
    case 'REMOVE':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.id),
      };
    case 'LOAD':
      return { ...state, annotations: action.annotations };
    case 'CLEAR':
      return { ...state, annotations: [], drawingAnnotation: null };
    default:
      return state;
  }
}

export function useAnnotations() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    setTool: (tool: AnnotationTool) => dispatch({ type: 'SET_TOOL', tool }),
    setColor: (color: string) => dispatch({ type: 'SET_COLOR', color }),
    setStrokeWidth: (width: number) => dispatch({ type: 'SET_STROKE', width }),
    startDrawing: (annotation: Annotation) =>
      dispatch({ type: 'START_DRAWING', annotation }),
    updateDrawing: (annotation: Annotation) =>
      dispatch({ type: 'UPDATE_DRAWING', annotation }),
    finishDrawing: () => dispatch({ type: 'FINISH_DRAWING' }),
    removeAnnotation: (id: string) => dispatch({ type: 'REMOVE', id }),
    loadAnnotations: (annotations: Annotation[]) =>
      dispatch({ type: 'LOAD', annotations }),
    clearAll: () => dispatch({ type: 'CLEAR' }),
  };
}
