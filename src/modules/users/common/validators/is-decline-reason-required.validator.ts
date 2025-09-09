import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { UserAvatarsManualDecisionDto } from "src/modules/user-avatars/common/dto";
import { EAvatarStatus } from "src/modules/user-avatars/common/enums";

const MIN_DECLINE_REASON_LENGTH = 5;
const MAX_DECLINE_REASON_LENGTH = 300;

export function IsDeclineReasonRequired(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isDeclineReasonRequired",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments): boolean {
          const dto = args.object as UserAvatarsManualDecisionDto;

          if (dto.status === EAvatarStatus.DECLINED) {
            return (
              typeof value === "string" &&
              value.trim().length >= MIN_DECLINE_REASON_LENGTH &&
              value.trim().length <= MAX_DECLINE_REASON_LENGTH
            );
          }

          return !value || value.trim() === "";
        },
        defaultMessage(): string {
          return `declineReason must be a valid string, must be between ${MIN_DECLINE_REASON_LENGTH} and ${MAX_DECLINE_REASON_LENGTH} characters when status is declined, and must be absent otherwise.`;
        },
      },
    });
  };
}
