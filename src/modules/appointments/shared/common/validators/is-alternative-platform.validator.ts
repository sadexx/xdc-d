import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { CreateVirtualAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";

export function IsAlternativePlatformValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isAlternativePlatformValid",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: boolean, args: ValidationArguments) {
          const relatedValue = args.object as CreateVirtualAppointmentDto | CreateDraftAppointmentsDto;

          if (relatedValue.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
            return value === false;
          }

          return true;
        },
        defaultMessage() {
          return "alternativePlatform must be false for on-demand scheduling type";
        },
      },
    });
  };
}
