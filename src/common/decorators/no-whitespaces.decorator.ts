import { ValidationOptions, registerDecorator, ValidationArguments } from "class-validator";
import { UNDEFINED_VALUE } from "src/common/constants";

export function NoWhitespaces(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "noWhitespaces",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          if (value === UNDEFINED_VALUE || value === null || value === "") {
            return true;
          }

          return !value.includes(" ");
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot contain spaces`;
        },
      },
    });
  };
}
