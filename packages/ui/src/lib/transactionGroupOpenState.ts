import type { TimePeriodMode } from "./timePeriodGrouping";

export function getInitialOpenGroupKeys(
  groupKeys: string[],
  periodMode: TimePeriodMode,
): string[] {
  if (periodMode === "day") {
    return groupKeys;
  }

  return groupKeys[0] ? [groupKeys[0]] : [];
}

export function reconcileOpenGroupKeys(
  openGroupKeys: string[],
  groupKeys: string[],
  previousPeriodMode: TimePeriodMode,
  periodMode: TimePeriodMode,
): string[] {
  if (groupKeys.length === 0) {
    return [];
  }

  if (periodMode === "day" && previousPeriodMode !== "day") {
    return groupKeys;
  }

  const validOpenKeys = openGroupKeys.filter((key) => groupKeys.includes(key));

  if (periodMode === "day") {
    return validOpenKeys;
  }

  return validOpenKeys.length > 0 ? validOpenKeys : [groupKeys[0]];
}
