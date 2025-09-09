import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { RateAppointmentByInterpreterDto } from "src/modules/appointments/appointment/common/dto";
import { FEEDBACK_REQUIRED_THRESHOLD } from "src/modules/appointments/appointment/common/constants";

export function IsFeedbackRequiredForCallRating(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "IsFeedbackRequiredForCallRating",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: number, args: ValidationArguments) {
          const feedbackValue = (args.object as RateAppointmentByInterpreterDto).appointmentCallRatingFeedback;

          if (value <= FEEDBACK_REQUIRED_THRESHOLD && !feedbackValue) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return `appointmentCallRatingFeedback is required when appointmentCallRating is equal to or below ${FEEDBACK_REQUIRED_THRESHOLD}`;
        },
      },
    });
  };
}
