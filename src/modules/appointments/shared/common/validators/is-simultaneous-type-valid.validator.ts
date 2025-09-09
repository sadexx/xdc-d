import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateFaceToFaceAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSimultaneousInterpretingType,
} from "src/modules/appointments/appointment/common/enums";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsSimultaneousTypeValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isSimultaneousTypeValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: EAppointmentSimultaneousInterpretingType, args: ValidationArguments) {
          const dto = args.object as CreateFaceToFaceAppointmentDto | CreateDraftAppointmentsDto;

          if (
            dto.communicationType === EAppointmentCommunicationType.FACE_TO_FACE &&
            dto.interpretingType === EAppointmentInterpretingType.SIMULTANEOUS
          ) {
            return Object.values(EAppointmentSimultaneousInterpretingType).includes(value);
          }

          return value === UNDEFINED_VALUE || value === null;
        },
        defaultMessage() {
          return "simultaneousInterpretingType must be one of the following values: conference, chuchotage if communicationType is face-to-face and interpretingType is simultaneous or must be absent otherwise.";
        },
      },
    });
  };
}
