import { FayAction } from './fayclient';
import {
  HARU_ACTION_MAP,
  SemanticMotionBinding
} from './live2d-action-map';

export function resolveActionMotion(action?: FayAction): SemanticMotionBinding | null {
  if (!action?.behavior) {
    return null;
  }

  return HARU_ACTION_MAP.behaviorMotions[action.behavior] || null;
}

export function resolveActionMotionNo(action?: FayAction): number | null {
  const binding = resolveActionMotion(action);
  if (!binding || binding.candidates.length === 0) {
    return null;
  }

  if (binding.candidates.length === 1) {
    return binding.candidates[0];
  }

  const normalized = Math.max(0, Math.min(action?.intensity ?? 0.5, 1));
  const index = Math.round(normalized * (binding.candidates.length - 1));
  return binding.candidates[index];
}

export function resolveActionExpression(action?: FayAction): string | null {
  if (!action?.affect) {
    return null;
  }

  return HARU_ACTION_MAP.affectExpressions[action.affect] || null;
}
