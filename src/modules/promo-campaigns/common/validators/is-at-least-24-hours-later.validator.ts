import { ValidationOptions, registerDecorator } from "class-validator";
import { add, isBefore } from "date-fns";

export function IsAtLeast24HoursLater(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isAtLeast24HoursLater",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: Date) {
          if (!value) {
            return true;
          }

          const date = value instanceof Date ? value : new Date(value);
          const twentyFourHoursFromNow = add(new Date(), { hours: 24 });

          return !isBefore(date, twentyFourHoursFromNow);
        },
        defaultMessage() {
          return "The date must be at least 24 hours from now.";
        },
      },
    });
  };
}
