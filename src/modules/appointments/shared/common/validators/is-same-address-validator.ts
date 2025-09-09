import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateExtraDayFaceToFaceDto } from "src/modules/appointments/appointment/common/dto";
import { CreateDraftExtraDayDto } from "src/modules/draft-appointments/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsValidAddress(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidAddress",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: CreateExtraDayFaceToFaceDto, args: ValidationArguments) {
          const relatedValue = (args.object as CreateExtraDayFaceToFaceDto | CreateDraftExtraDayDto).sameAddress;

          if (relatedValue === false) {
            return value !== UNDEFINED_VALUE && value !== null;
          }

          return value === UNDEFINED_VALUE || value === null;
        },
        defaultMessage(args: ValidationArguments) {
          const relatedValue = (args.object as CreateExtraDayFaceToFaceDto | CreateDraftExtraDayDto).sameAddress;

          if (relatedValue === false) {
            return "Address must be provided when sameAddress is false";
          }

          return "Address must be absent when sameAddress is true";
        },
      },
    });
  };
}
