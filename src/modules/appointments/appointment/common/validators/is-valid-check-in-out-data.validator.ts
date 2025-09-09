import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CheckInOutAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { EAppointmentExternalSessionType } from "src/modules/appointments/appointment/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsValidCheckInOutData(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidCheckInOutData",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as CheckInOutAppointmentDto;
          const { type, verifyingPersonName, verifyingPersonSignature, alternativeTime } = dto;

          if (type === EAppointmentExternalSessionType.CHECK_IN_ALTERNATIVE_PLATFORM) {
            return (
              verifyingPersonName === UNDEFINED_VALUE &&
              verifyingPersonSignature === UNDEFINED_VALUE &&
              alternativeTime === UNDEFINED_VALUE
            );
          } else {
            return verifyingPersonName !== UNDEFINED_VALUE && verifyingPersonSignature !== UNDEFINED_VALUE;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const dto = args.object as CheckInOutAppointmentDto;
          const { type } = dto;

          if (type === EAppointmentExternalSessionType.CHECK_IN_ALTERNATIVE_PLATFORM) {
            return "For alternative platform check-in, verifyingPersonName, verifyingPersonSignature and alternativeTime are not required.";
          }

          return "verifyingPersonName and verifyingPersonSignature are required for face-to-face operations and alternative platform check-out.";
        },
      },
    });
  };
}
