import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { differenceInMinutes, isValid, parse } from "date-fns";
import { NUMBER_OF_MINUTES_IN_DAY } from "src/common/constants";
import { UpdateRateDto } from "src/modules/rates/common/dto";
import { STANDARD_RATE_HOUR_END, STANDARD_RATE_HOUR_START } from "src/modules/rates/common/constants";

/**
 * Validates that a time is in the correct format, and start normal hours must be before end normal hours.
 *
 * For first version of API, validate only the default normal hours start and end, rest of the time values are not validated.
 *
 * Format pattern: HH:MM:00 (e.g., 09:00:00).
 *
 * @param validationOptions The validation options.
 * @returns A function that will be called to validate the value.
 */
export function IsValidTimeFormat(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidTimeFormat",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const object = args.object as UpdateRateDto;
          const normalStart = object.normalHoursStart;
          const normalEnd = object.normalHoursEnd;

          if (typeof normalStart !== "string" || typeof normalEnd !== "string") {
            return false;
          }

          const TIME_REGEX_PATTERN: RegExp = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9]):00$/;

          if (!TIME_REGEX_PATTERN.test(normalStart) || !TIME_REGEX_PATTERN.test(normalEnd)) {
            return false;
          }

          const newDate = new Date();
          const startDate = parse(normalStart, "HH:mm:ss", newDate);
          const endDate = parse(normalEnd, "HH:mm:ss", newDate);

          if (normalStart !== STANDARD_RATE_HOUR_START || normalEnd !== STANDARD_RATE_HOUR_END) {
            return false;
          }

          if (!isValid(startDate) || !isValid(endDate)) {
            return false;
          }

          if (startDate.getTime() === endDate.getTime() || startDate.getTime() > endDate.getTime()) {
            return false;
          }

          const normalMinutes = differenceInMinutes(endDate, startDate);

          return normalMinutes > 0 && normalMinutes < NUMBER_OF_MINUTES_IN_DAY;
        },
        defaultMessage() {
          return "Time must be in HH:MM:00 format (e.g., 09:00:00), and start normal hours must be before end normal hours.";
        },
      },
    });
  };
}
