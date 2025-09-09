import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsValidCommunicationAddress(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidCommunicationAddress",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: object | undefined, args: ValidationArguments) {
          const communicationType = (args.object as CreateDraftAppointmentsDto).communicationType;

          if (communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
            return value !== UNDEFINED_VALUE;
          } else {
            return value === UNDEFINED_VALUE;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const communicationType = (args.object as CreateDraftAppointmentsDto).communicationType;

          if (communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
            return "Address is required for face-to-face communication type.";
          } else {
            return "Address must not be provided for video or audio communication types.";
          }
        },
      },
    });
  };
}
