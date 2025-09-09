import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateVirtualAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

const MIN_PLATFORM_LINK_LENGTH = 20;
const MAX_PLATFORM_LINK_LENGTH = 300;

export function IsValidAlternativePlatform(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidAlternativePlatform",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments): boolean {
          const dto = args.object as CreateVirtualAppointmentDto;

          if (dto.alternativePlatform === false && value !== UNDEFINED_VALUE) {
            return false;
          }

          if (dto.alternativePlatform === true) {
            return (
              typeof value === "string" &&
              value.trim().length >= MIN_PLATFORM_LINK_LENGTH &&
              value.trim().length <= MAX_PLATFORM_LINK_LENGTH
            );
          }

          return !value || value.trim() === "";
        },

        defaultMessage() {
          return `alternativeVideoConferencingPlatformLink must be a valid string, must be between ${MIN_PLATFORM_LINK_LENGTH} and ${MAX_PLATFORM_LINK_LENGTH} characters when alternativePlatform is true, and must be absent otherwise.`;
        },
      },
    });
  };
}
