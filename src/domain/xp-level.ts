export type XpLevelProgress = {
  level: number;
  levelFloor: number;
  nextLevelAt: number;
  progress: number;
};

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 125 * safeLevel * (safeLevel - 1);
}

export function getXpLevelProgress(totalXp: number): XpLevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= safeXp) level += 1;
  const levelFloor = xpRequiredForLevel(level);
  const nextLevelAt = xpRequiredForLevel(level + 1);
  return {
    level,
    levelFloor,
    nextLevelAt,
    progress: (safeXp - levelFloor) / (nextLevelAt - levelFloor)
  };
}
