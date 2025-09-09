import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { RateAppointmentByClientDto } from "src/modules/appointments/appointment/common/dto";
import { FEEDBACK_REQUIRED_THRESHOLD } from "src/modules/appointments/appointment/common/constants";

export function IsFeedbackRequiredForInterpreterRating(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "IsFeedbackRequiredForInterpreterRating",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: number, args: ValidationArguments) {
          const feedbackValue = (args.object as RateAppointmentByClientDto).interpreterRatingFeedback;

          if (value <= FEEDBACK_REQUIRED_THRESHOLD && !feedbackValue) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return `interpreterRatingFeedback is required when interpreterRating is equal to or below ${FEEDBACK_REQUIRED_THRESHOLD}`;
        },
      },
    });
  };
}
