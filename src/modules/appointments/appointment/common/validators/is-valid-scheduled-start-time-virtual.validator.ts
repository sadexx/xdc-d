import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE, NUMBER_OF_MINUTES_IN_HOUR } from "src/common/constants";
import { CreateVirtualAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";

export function IsValidScheduledStartTimeVirtual(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidScheduledStartTimeVirtual",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: string, args: ValidationArguments) {
          const object = args.object as CreateVirtualAppointmentDto;
          const schedulingType: EAppointmentSchedulingType = object.schedulingType;
          const scheduledStartTime = new Date(object.scheduledStartTime).getTime();

          if (!scheduledStartTime || !schedulingType) {
            return true;
          }

          const now = new Date();
          const adjustedNow = new Date(now.getTime());
          const diffInMs = scheduledStartTime - adjustedNow.getTime();
          const diffInMinutes = diffInMs / NUMBER_OF_MILLISECONDS_IN_MINUTE;

          if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
            return diffInMinutes < NUMBER_OF_MINUTES_IN_HOUR;
          } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
            return diffInMinutes > NUMBER_OF_MINUTES_IN_HOUR;
          }

          return false;
        },

        defaultMessage(args: ValidationArguments) {
          const object = args.object as CreateVirtualAppointmentDto;
          const schedulingType: EAppointmentSchedulingType = object.schedulingType;

          if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
            return "For on-demand scheduling, the start time must be within the next hour.";
          } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
            return "For pre-booked or special scheduling, the start time must be more than one hour from now.";
          }

          return "Invalid scheduling type or scheduled start time.";
        },
      },
    });
  };
}
