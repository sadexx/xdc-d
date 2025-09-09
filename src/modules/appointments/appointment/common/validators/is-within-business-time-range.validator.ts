import { registerDecorator, ValidationOptions } from "class-validator";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE } from "src/common/constants";

export function IsWithinBusinessTimeRange(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isWithinBusinessTimeRange",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          const date = new Date(value);
          const now = new Date();
          const fiveMinutes = 5;
          const oneHundredTwentyMinutes = 120;

          const fiveMinutesLater = new Date(now.getTime() + fiveMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);

          const oneHundredTwentyMinutesLater = new Date(
            now.getTime() + oneHundredTwentyMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
          );

          return date >= fiveMinutesLater && date <= oneHundredTwentyMinutesLater;
        },
        defaultMessage() {
          return `Date must be between 5 and 120 minutes from now`;
        },
      },
    });
  };
}
