export function successFeeCents(bidAmount: number): number {
  if (bidAmount < 500) return 2_500;
  if (bidAmount < 1_000) return 5_000;
  return Math.min(Math.round(bidAmount * 3), 50_000);
}

export function formatFee(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}