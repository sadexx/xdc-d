import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

const MIN_PLATFORM_LINK_LENGTH = 20;
const MAX_PLATFORM_LINK_LENGTH = 300;

export function IsValidDraftAlternativePlatformLink(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidDraftAlternativePlatformLink",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string | undefined, args: ValidationArguments) {
          const alternativePlatform = (args.object as CreateDraftAppointmentsDto).alternativePlatform;

          if (alternativePlatform) {
            return (
              typeof value === "string" &&
              value.length >= MIN_PLATFORM_LINK_LENGTH &&
              value.length <= MAX_PLATFORM_LINK_LENGTH
            );
          } else {
            return value === UNDEFINED_VALUE;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const alternativePlatform = (args.object as CreateDraftAppointmentsDto).alternativePlatform;

          if (alternativePlatform) {
            return `Alternative video conferencing platform link must be between ${MIN_PLATFORM_LINK_LENGTH} and ${MAX_PLATFORM_LINK_LENGTH} characters when alternativePlatform is true.`;
          } else {
            return "Alternative video conferencing platform link must be empty when alternativePlatform is false.";
          }
        },
      },
    });
  };
}
