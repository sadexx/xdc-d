import { BadRequestException } from "@nestjs/common";
import { round2 } from "src/common/utils";
import { ECommonErrorCodes } from "src/common/enums";

/**
 * Safely parses a string to a number, with optional rounding.
 * @param value The string value to parse.
 * @returns The parsed number.
 */
export function parseDecimalNumber(value: string): number {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException(ECommonErrorCodes.INVALID_DECIMAL_EMPTY_OR_NOT_STRING);
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new BadRequestException(ECommonErrorCodes.INVALID_DECIMAL_NAN);
  }

  return num;
}

/**
 * Formats a number to a rounded decimal string with fixed precision.
 * @param value The number to format.
 * @returns The formatted string (e.g., '10.50').
 */
export function formatDecimalString(value: number): string {
  if (isNaN(value) || !isFinite(value)) {
    throw new BadRequestException(ECommonErrorCodes.INVALID_DECIMAL_NAN_OR_INFINITE);
  }

  return round2(value).toString();
}
