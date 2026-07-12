export const SPLIT_GRID_LAYOUT_OPTIONS = [
  { rows: 2, cols: 2 },
  { rows: 1, cols: 5 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 2 },
  { rows: 2, cols: 4 },
  { rows: 3, cols: 3 },
  { rows: 2, cols: 5 },
] as const;

export type ProposalSplitGridCount = 4 | 6 | 8 | 9 | 10;
const PROPOSAL_SPLIT_GRID_COUNTS: readonly ProposalSplitGridCount[] = [4, 6, 8, 9, 10];

export function getProposalSplitGridLayout(targetCount: unknown): { targetCount: ProposalSplitGridCount; gridRows: number; gridCols: number } | null {
  if (typeof targetCount !== "number" || !PROPOSAL_SPLIT_GRID_COUNTS.includes(targetCount as ProposalSplitGridCount)) return null;
  const count = targetCount as ProposalSplitGridCount;
  const layout = SPLIT_GRID_LAYOUT_OPTIONS.find(({ rows, cols }) => rows * cols === count && rows <= cols);
  if (!layout) return null;
  return { targetCount: count, gridRows: layout.rows, gridCols: layout.cols };
}
