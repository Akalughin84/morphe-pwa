export class WorkoutTimer {
  start(durationSec, onTick, onComplete) {
    let remaining = durationSec;
    const interval = setInterval(() => {
      remaining--;
      onTick?.(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return interval;
  }
}