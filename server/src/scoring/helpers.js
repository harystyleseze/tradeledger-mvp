export function groupByDay(txns) {
  return txns.reduce((acc, t) => {
    const day = t.timeCreated.split("T")[0];
    acc[day] = (acc[day] || 0) + t.amount;
    return acc;
  }, {});
}

export function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
  if (arr.length < 2) return 0;
  const avg = average(arr);
  return Math.sqrt(
    arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length
  );
}

export function longestActiveStreak(days) {
  let max = 0;
  let cur = 0;
  for (const d of days) {
    if (d > 0) {
      cur++;
      max = Math.max(max, cur);
    } else {
      cur = 0;
    }
  }
  return max;
}
