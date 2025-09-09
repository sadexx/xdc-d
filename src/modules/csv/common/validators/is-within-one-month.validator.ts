import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { differenceInDays } from "date-fns";
import { GetCsvAppointmentsDto, GetCsvDraftAppointmentsDto } from "src/modules/csv/common/dto";
import { NUMBER_OF_DAYS_IN_MONTH } from "src/common/constants";

export function IsWithinOneMonth(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isWithinOneMonth",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as GetCsvAppointmentsDto | GetCsvDraftAppointmentsDto;
          const daysDifference = differenceInDays(dto.endDate, dto.startDate);

          return daysDifference <= NUMBER_OF_DAYS_IN_MONTH;
        },
        defaultMessage() {
          return `The period between startDate and endDate must not exceed ${NUMBER_OF_DAYS_IN_MONTH} days.`;
        },
      },
    });
  };
}
