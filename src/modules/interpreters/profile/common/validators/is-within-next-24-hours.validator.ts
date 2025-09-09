import { registerDecorator, ValidationOptions } from "class-validator";
import { add, isAfter, isBefore } from "date-fns";

export function IsWithinNext24Hours(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isWithinNext24Hours",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          if (!value) {
            return false;
          }

          const currentTime = new Date();
          const oneDayFromNow = add(currentTime, { hours: 24 });

          return isAfter(value, currentTime) && isBefore(value, oneDayFromNow);
        },
        defaultMessage() {
          return "The date must be within the next 24 hours.";
        },
      },
    });
  };
}
