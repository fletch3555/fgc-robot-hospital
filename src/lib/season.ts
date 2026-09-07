const FALLBACK_SEASON = 2026;

/**
 * The current event year. New requests/spare-parts records are tagged
 * with this, and default list views are scoped to it. Bump EVENT_SEASON
 * in the environment (and the DB column default, see migrations/README.md)
 * at the start of each new season.
 */
export function getCurrentSeason(): number {
  const value = process.env.EVENT_SEASON;

  if (!value) {
    console.warn(`EVENT_SEASON is not set; defaulting to ${FALLBACK_SEASON}`);
    return FALLBACK_SEASON;
  }

  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid EVENT_SEASON value: ${value}`);
  }

  return parsed;
}
