import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { SendRegistrationLinkDto } from "src/modules/auth/common/dto";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsProfileAndAddressRequiredForRegistrationLink(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isProfileAndAddressRequiredForRegistrationLink",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as SendRegistrationLinkDto;

          if (dto.role === EUserRoleName.LFH_BOOKING_OFFICER) {
            const hasAddress = dto.address !== UNDEFINED_VALUE;
            const hasProfile = dto.profileInformation !== UNDEFINED_VALUE;

            return hasAddress && hasProfile;
          }

          return true;
        },

        defaultMessage() {
          return `To register this role, both address and profile information are required.`;
        },
      },
    });
  };
}
