export function round2(value: number, fractionDigits: number = 2): number {
  return Number(Number(value).toFixed(fractionDigits));
}

export function round2Nullable(value: number | null, fractionDigits: number = 2): number | null {
  if (value === null) {
    return null;
  }

  return Number(Number(value).toFixed(fractionDigits));
}
