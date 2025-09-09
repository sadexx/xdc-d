import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { CreateAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";

export function IsSchedulingExtraDayValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isSchedulingExtraDayValid",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: boolean, args: ValidationArguments) {
          const dto = args.object as CreateAppointmentDto | CreateDraftAppointmentsDto;

          if (dto.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
            return value === false;
          }

          return true;
        },
        defaultMessage() {
          return "schedulingExtraDay must be false for on-demand scheduling type";
        },
      },
    });
  };
}
