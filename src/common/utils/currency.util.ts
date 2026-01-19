export const toCents = (amount: number): number => {
  if (!amount) return 0;
  return Math.round(amount * 100);
};

export const fromCents = (amount: number): number => {
  if (!amount) return 0;
  return amount / 100;
};
