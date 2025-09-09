import { registerDecorator, ValidationOptions } from "class-validator";

/**
 * Validates that a string matches the AWS Chime AttendeeId format.
 * Format pattern: [a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}
 * @param validationOptions Optional validation options
 */
export function IsAwsChimeAttendeeId(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isAwsChimeAttendeeId",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== "string") {
            return false;
          }

          const AWS_CHIME_ATTENDEE_ID_PATTERN: RegExp = /^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/;

          return AWS_CHIME_ATTENDEE_ID_PATTERN.test(value);
        },
        defaultMessage() {
          return `${String(propertyName)} must be a valid AWS Chime AttendeeId format`;
        },
      },
    });
  };
}
