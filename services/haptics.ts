export const vibrate = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const hapticImpact = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate([30, 50, 30]),
  success: () => vibrate([10, 30, 50]),
  error: () => vibrate([50, 30, 50, 30]),
};
