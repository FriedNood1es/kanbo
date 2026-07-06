// Fractional midpoint indexing — reordering one card only ever rewrites that
// card's position, never its neighbors'. New positions are always the
// midpoint of (or just outside) the neighbours, so a card can be inserted
// anywhere without renumbering the rest of the column.
export function computePosition(prev: number | undefined, next: number | undefined) {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}
