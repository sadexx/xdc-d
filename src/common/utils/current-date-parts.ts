export function getCurrentDateParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const currentDate = new Date();
  const ZERO_BASED_MONTH_OFFSET = 1;
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth() + ZERO_BASED_MONTH_OFFSET;
  const day = currentDate.getUTCDate();
  const hour = currentDate.getUTCHours();
  const minute = currentDate.getUTCMinutes();

  return { year, month, day, hour, minute };
}
