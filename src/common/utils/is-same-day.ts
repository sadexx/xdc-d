export function isSameDay(currentTime: Date, compareDate: Date): boolean {
  return (
    currentTime.getFullYear() === compareDate.getFullYear() &&
    currentTime.getMonth() === compareDate.getMonth() &&
    currentTime.getDate() === compareDate.getDate()
  );
}
