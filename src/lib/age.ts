export function ageInMonths(birthdayStr: string): number {
  const now = new Date();
  const birth = new Date(birthdayStr);
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0)
  );
}

export function formatAge(months: number): string {
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} old`;
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  return mo > 0 ? `${yrs} yr ${mo} mo old` : `${yrs} years old`;
}

// TODO: `ageGroups` is a raw semicolon-delimited string that gets re-parsed on every call.
// Consider pre-parsing it into a typed structure (e.g. `{ minMonths: number; maxMonths: number }[]`)
// so callers hold structured data and this function just does a range check.
export function providerMatchesAge(ageGroups: string, childMonths: number): boolean {
  return ageGroups
    .split(";")
    .map((s) => s.trim())
    .some((g) => {
      const mo = g.match(/^([\d.]+)\s*-\s*([\d.]+)\s*mo$/);
      if (mo) return childMonths >= +mo[1] && childMonths <= +mo[2];
      const yr = g.match(/^([\d.]+)\s*-\s*([\d.]+)\s*yrs?$/);
      if (yr)
        return (
          childMonths >= Math.round(+yr[1] * 12) &&
          childMonths <= Math.round(+yr[2] * 12)
        );
      return false;
    });
}
