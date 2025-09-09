import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateFaceToFaceAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsAlternativePlatformNotAllowed(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isAlternativePlatformNotAllowed",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const { alternativePlatform, alternativeVideoConferencingPlatformLink } =
            args.object as CreateFaceToFaceAppointmentDto;

          return alternativePlatform === false && alternativeVideoConferencingPlatformLink === UNDEFINED_VALUE;
        },
        defaultMessage() {
          return "Face-to-face appointments cannot have alternativePlatform";
        },
      },
    });
  };
}
