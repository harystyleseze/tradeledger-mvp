import { scoreMerchant, calculateAdvance } from "../engine.js";

function makeTxn(overrides = {}) {
  return {
    status: "success",
    amount: 200000, // ₦2,000 in kobo
    source: "pos",
    timeCreated: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

function daysOfTxns(n, amountKobo = 200000, source = "pos") {
  return Array.from({ length: n }, (_, i) => {
    const date = new Date("2026-06-01");
    date.setDate(date.getDate() + i);
    return makeTxn({ amount: amountKobo, source, timeCreated: date.toISOString() });
  });
}

// --- scoreMerchant ---

test("returns ineligible for empty transactions", () => {
  expect(scoreMerchant([])).toMatchObject({ score: 0, eligible: false });
});

test("returns ineligible when fewer than 10 successful transactions", () => {
  const txns = Array.from({ length: 9 }, () => makeTxn());
  expect(scoreMerchant(txns)).toMatchObject({ score: 0, reason: "insufficient_history" });
});

test("returns ineligible when fewer than 7 active days", () => {
  // 10 txns all on same day = 1 day
  const txns = Array.from({ length: 10 }, () => makeTxn());
  expect(scoreMerchant(txns)).toMatchObject({ score: 0, reason: "insufficient_days" });
});

test("failed transactions do not count toward score", () => {
  const passing = daysOfTxns(30, 200000);
  const failing = Array.from({ length: 20 }, () => makeTxn({ status: "failed" }));
  const result = scoreMerchant([...passing, ...failing]);
  expect(result.eligible).toBe(true);
});

test("high-revenue merchant scores above 40", () => {
  // ₦50,000/day = 5,000,000 kobo — well above the ₦20K threshold
  const txns = daysOfTxns(60, 5000000);
  const result = scoreMerchant(txns);
  expect(result.score).toBeGreaterThan(40);
  expect(result.eligible).toBe(true);
});

test("channel diversity adds up to 15pts for 3+ channels", () => {
  const txns = [
    ...daysOfTxns(10, 200000, "pos"),
    ...daysOfTxns(10, 200000, "web"),
    ...daysOfTxns(10, 200000, "ussd"),
  ];
  const result = scoreMerchant(txns);
  expect(result.breakdown.diversityScore).toBe(15);
});

test("single-channel merchant scores 5pts diversity", () => {
  const txns = daysOfTxns(30, 200000, "pos");
  const result = scoreMerchant(txns);
  expect(result.breakdown.diversityScore).toBe(5);
});

test("null source fields are ignored in diversity count", () => {
  const txns = daysOfTxns(30, 200000, null);
  const result = scoreMerchant(txns);
  expect(result.breakdown.diversityScore).toBe(0);
});

test("perfectly consistent revenue scores full consistency points", () => {
  // Zero variation = max consistency score
  const txns = daysOfTxns(30, 1000000);
  const result = scoreMerchant(txns);
  expect(result.breakdown.consistencyScore).toBeCloseTo(20, 0);
});

test("score breakdown values sum to total", () => {
  const txns = daysOfTxns(60, 1000000);
  const result = scoreMerchant(txns);
  const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
  expect(Math.abs(result.score - Math.round(sum))).toBeLessThanOrEqual(1);
});

// --- calculateAdvance ---

test("returns ineligible for score < 40", () => {
  expect(calculateAdvance(39, 1000000)).toMatchObject({ eligible: false });
});

test("advance is capped at ₦500,000 (50,000,000 kobo)", () => {
  const result = calculateAdvance(100, 100000000); // massive weekly revenue
  expect(result.amount).toBe(50000000);
});

test("advance at score 40 is at least 1.2× weekly revenue", () => {
  const weekly = 1000000; // ₦10,000
  const result = calculateAdvance(40, weekly);
  expect(result.amount).toBeGreaterThanOrEqual(weekly * 1.2);
});

test("advance at score 100 is at most 3× weekly revenue", () => {
  const weekly = 1000000;
  const result = calculateAdvance(100, weekly);
  expect(result.amount).toBeLessThanOrEqual(weekly * 3);
});

test("repayment rate is 15%", () => {
  const result = calculateAdvance(70, 1000000);
  expect(result.repaymentRate).toBe(0.15);
});
