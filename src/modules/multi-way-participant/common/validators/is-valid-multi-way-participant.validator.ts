import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateMultiWayParticipantDto } from "src/modules/multi-way-participant/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsValidMultiWayParticipant(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidMultiWayParticipant",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateMultiWayParticipantDto;

          const hasPhoneNumber = dto.phoneNumber !== UNDEFINED_VALUE;
          const hasPhoneCode = dto.phoneCode !== UNDEFINED_VALUE;
          const hasEmail = dto.email !== UNDEFINED_VALUE;

          if (!hasEmail && !hasPhoneNumber && !hasPhoneCode) {
            return false;
          }

          if ((hasPhoneCode && !hasPhoneNumber) || (!hasPhoneCode && hasPhoneNumber)) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return "You must provide a valid email, or phoneCode and phoneNumber. Also you can provide both.";
        },
      },
    });
  };
}
