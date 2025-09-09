import { differenceInMinutes } from "date-fns";
import {
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_SECONDS_IN_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";

export function getDifferenceInHHMM(startDate: Date, endDate: Date): string {
  const COUNT_OF_NUMBER_IN_HOURS = 2;
  const differenceMs = differenceInMinutes(endDate, startDate);

  const hours = Math.floor(differenceMs / NUMBER_OF_MINUTES_IN_HOUR);
  const minutes = Math.floor(differenceMs % NUMBER_OF_MINUTES_IN_HOUR);

  const formattedHours = String(hours).padStart(COUNT_OF_NUMBER_IN_HOURS, "0");
  const formattedMinutes = String(minutes).padStart(COUNT_OF_NUMBER_IN_HOURS, "0");

  return `${formattedHours}:${formattedMinutes}`;
}

export function getDifferenceInHHMMSS(startDate: Date | null | undefined, endDate: Date | null | undefined): string {
  if (!startDate || !endDate) {
    return "-";
  }

  const COUNT_OF_NUMBER_IN_HOURS = 2;

  let diffInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / NUMBER_OF_MILLISECONDS_IN_SECOND);

  if (diffInSeconds < 0) {
    diffInSeconds = 0;
  }

  const hours = Math.floor(diffInSeconds / NUMBER_OF_SECONDS_IN_HOUR);
  const minutes = Math.floor((diffInSeconds % NUMBER_OF_SECONDS_IN_HOUR) / NUMBER_OF_SECONDS_IN_MINUTE);
  const seconds = diffInSeconds % NUMBER_OF_SECONDS_IN_MINUTE;

  const pad = (num: number): string => num.toString().padStart(COUNT_OF_NUMBER_IN_HOURS, "0");

  if (hours >= 1) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}
