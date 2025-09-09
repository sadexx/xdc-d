import { registerDecorator, ValidationOptions } from "class-validator";
import { addMonths, isAfter, isBefore } from "date-fns";
import { NUMBER_OF_MONTHS_IN_HALF_YEAR } from "src/common/constants";

export function IsFutureDate(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isFutureDate",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          if (!value) {
            return false;
          }

          const currentTime = new Date();
          const sixMonthsFromNow = addMonths(currentTime, NUMBER_OF_MONTHS_IN_HALF_YEAR);

          return isAfter(value, currentTime) && isBefore(value, sixMonthsFromNow);
        },
        defaultMessage() {
          return "Date must be in the future and within the next six months";
        },
      },
    });
  };
}
