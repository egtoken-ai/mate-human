export interface SemanticMotionBinding {
  group: string;
  candidates: number[];
}

export interface SemanticActionMap {
  behaviorMotions: Record<string, SemanticMotionBinding>;
  affectExpressions: Record<string, string>;
}

export const HARU_ACTION_MAP: SemanticActionMap = {
  behaviorMotions: {
    nod: { group: 'TapBody', candidates: [1, 3] },
    invite: { group: 'TapBody', candidates: [21] },
    wave: { group: 'TapBody', candidates: [10] },
    reject: { group: 'TapBody', candidates: [2, 7] },
    think: { group: 'TapBody', candidates: [11, 12] },
    question: { group: 'TapBody', candidates: [18, 12] },
    explain: { group: 'TapBody', candidates: [22, 23] },
    recommend: { group: 'TapBody', candidates: [24] },
    summary: { group: 'TapBody', candidates: [26] },
    wait: { group: 'TapBody', candidates: [19] },
    remind: { group: 'TapBody', candidates: [20] },
    warn: { group: 'TapBody', candidates: [25] },
    thanks: { group: 'TapBody', candidates: [17, 9] },
    apology: { group: 'TapBody', candidates: [16, 17] },
    care: { group: 'TapBody', candidates: [5, 9] },
    celebrate: { group: 'TapBody', candidates: [6, 13] },
    surprise: { group: 'TapBody', candidates: [13, 14] },
    sad: { group: 'TapBody', candidates: [15, 8] }
  },
  affectExpressions: {
    smile: 'F01',
    warm: 'F01',
    neutral: 'F01',
    curious: 'F04',
    serious: 'F02',
    sorry: 'F03',
    sad: 'F03',
    surprised: 'F04',
    excited: 'F04'
  }
};
