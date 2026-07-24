export const swipeThresholds = {
  distance: 120,
  velocity: 800
} as const;

export type SwipeDecision = 'left' | 'right' | null;

export function getSwipeDecision(translationX: number, velocityX: number): SwipeDecision {
  const exceedsDistance = Math.abs(translationX) >= swipeThresholds.distance;
  const exceedsVelocity = Math.abs(velocityX) >= swipeThresholds.velocity;

  if (!exceedsDistance && !exceedsVelocity) return null;
  const direction = exceedsVelocity ? velocityX : translationX;
  return direction > 0 ? 'right' : 'left';
}
