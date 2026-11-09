// The staff pages this person may open, as lib/staffTiles.ts lists them — so the Trail can say "ask for this
// one" instead of sending someone to a button they do not have. Website-specific (the app has its own).
import { useStaffTiles } from '../../lib/staffTiles'

/** null while the menu is still being worked out. */
export function useOpenablePaths(): string[] | null {
  const { tiles } = useStaffTiles()
  return tiles.map((t) => t.to)
}

/** The website has no Sell page, so nobody here is "sales only". */
export function useIsCounterOnly(): boolean {
  return false
}
