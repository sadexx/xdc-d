import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";

export function IsValidInterpretingType(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidInterpretingType",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: EAppointmentInterpretingType, args: ValidationArguments) {
          const dto = args.object as CreateDraftAppointmentsDto;

          if (
            value === EAppointmentInterpretingType.SIMULTANEOUS &&
            dto.communicationType !== EAppointmentCommunicationType.FACE_TO_FACE
          ) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return "simultaneous interpretingType can only be used if communication type is face-to-face.";
        },
      },
    });
  };
}
