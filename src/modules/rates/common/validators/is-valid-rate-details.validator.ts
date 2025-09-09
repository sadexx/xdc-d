import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { NUMBER_OF_MINUTES_IN_HOUR } from "src/common/constants";
import { UpdateRateDto } from "src/modules/rates/common/dto";
import { ERateDetailsSequence } from "src/modules/rates/common/enums";

/**
 * Validates that the details field matches the expected pattern based on detailsSequence
 * and that the number in details matches detailsTime.
 *
 * Patterns:
 * - first-minutes: up-to-the-first-${number}-minutes
 * - additional-block: up-to-${number}-minutes-each-additional-block
 * - all-day: calculated-per-day-${number}-hours
 *
 * Number range: 1-480
 *
 * @param validationOptions The validation options.
 * @returns A function that will be called to validate the value.
 */
export function IsValidRateDetails(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidRateDetails",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as UpdateRateDto;
          const { details, detailsSequence, detailsTime } = dto;

          if (typeof details !== "string" || typeof detailsTime !== "number") {
            return false;
          }

          let expectedPattern: RegExp;
          let extractedNumber: number | null = null;

          switch (detailsSequence) {
            case ERateDetailsSequence.FIRST_MINUTES: {
              expectedPattern = /^up-to-the-first-(\d+)-minutes$/;
              const firstMatch = details.match(expectedPattern);

              if (firstMatch) {
                extractedNumber = parseInt(firstMatch[1], 10);
              }

              break;
            }

            case ERateDetailsSequence.ADDITIONAL_BLOCK: {
              expectedPattern = /^up-to-(\d+)-minutes-each-additional-block$/;
              const additionalMatch = details.match(expectedPattern);

              if (additionalMatch) {
                extractedNumber = parseInt(additionalMatch[1], 10);
              }

              break;
            }

            case ERateDetailsSequence.ALL_DAY: {
              expectedPattern = /^calculated-per-day-(\d+)-hours$/;
              const allDayMatch = details.match(expectedPattern);

              if (allDayMatch) {
                extractedNumber = parseInt(allDayMatch[1], 10);
                extractedNumber = extractedNumber * NUMBER_OF_MINUTES_IN_HOUR;
              }

              break;
            }

            default:
              return false;
          }

          if (extractedNumber === null || extractedNumber !== detailsTime) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as UpdateRateDto;
          const detailsSequence = dto.detailsSequence;

          switch (detailsSequence) {
            case ERateDetailsSequence.FIRST_MINUTES:
              return "Details must match pattern 'up-to-the-first-{number}-minutes' where number matches detailsTime (1-480)";
            case ERateDetailsSequence.ADDITIONAL_BLOCK:
              return "Details must match pattern 'up-to-{number}-minutes-each-additional-block' where number matches detailsTime (1-480)";
            case ERateDetailsSequence.ALL_DAY:
              return "Details must match pattern 'calculated-per-day-{number}-hours' where number matches detailsTime (1-480)";
            default:
              return "Invalid detailsSequence or details format";
          }
        },
      },
    });
  };
}
