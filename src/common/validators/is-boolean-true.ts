import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsBooleanTrue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isBooleanTrue",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: boolean) {
          return value === true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be true.`;
        },
      },
    });
  };
}
