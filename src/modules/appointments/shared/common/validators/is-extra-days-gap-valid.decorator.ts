import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { addMinutes } from "date-fns";
import {
  CreateAppointmentDto,
  CreateExtraDayFaceToFaceDto,
  CreateExtraDayVirtualDto,
} from "src/modules/appointments/appointment/common/dto";
import { CreateDraftAppointmentsDto, CreateDraftExtraDayDto } from "src/modules/draft-appointments/common/dto";

export function IsExtraDaysGapValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (target: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isExtraDaysGapValid",
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(
          value: CreateExtraDayVirtualDto | CreateExtraDayFaceToFaceDto | CreateDraftExtraDayDto[],
          args: ValidationArguments,
        ) {
          if (!Array.isArray(value) || value.length === 0) {
            return true;
          }

          const dto = args.object as CreateAppointmentDto | CreateDraftAppointmentsDto;
          const mainStart = new Date(dto.scheduledStartTime);
          const mainEnd = addMinutes(mainStart, dto.schedulingDurationMin);
          const timeline = [{ start: mainStart, end: mainEnd }];

          for (const extraDay of value) {
            const start = new Date(extraDay.scheduledStartTime);
            const end = addMinutes(start, extraDay.schedulingDurationMin);
            timeline.push({ start, end });
          }

          timeline.sort((a, b) => a.start.getTime() - b.start.getTime());

          for (const [i, currentItem] of timeline.entries()) {
            if (i === timeline.length - 1) {
              break;
            }

            const currentEnd = currentItem.end.getTime();
            const nextStart = timeline[i + 1].start.getTime();

            if (nextStart < currentEnd) {
              return false;
            }
          }

          return true;
        },
        defaultMessage() {
          return "Each extra day must start at least after the previous extra day ends";
        },
      },
    });
  };
}
