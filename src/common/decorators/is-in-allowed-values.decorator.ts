/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ async: true })
export class IsInAllowedValuesConstraint implements ValidatorConstraintInterface {
  validate(sortBy: any, args: ValidationArguments): any {
    const [validKeys] = args.constraints;

    return validKeys.includes(sortBy);
  }

  defaultMessage(args: ValidationArguments): string {
    const [validKeys] = args.constraints;

    return `'${args.value}' should be one of ${validKeys.join(", ")}`;
  }
}

export function IsInAllowedValues(validKeys: string[], validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [validKeys],
      validator: IsInAllowedValuesConstraint,
    });
  };
}
