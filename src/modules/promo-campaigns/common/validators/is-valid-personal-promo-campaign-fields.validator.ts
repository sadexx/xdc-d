import { ValidationOptions, registerDecorator, ValidationArguments } from "class-validator";
import { CreatePersonalPromoCampaignDto } from "src/modules/promo-campaigns/common/dto";
import { EPromoCampaignTarget } from "src/modules/promo-campaigns/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

export function IsValidPersonalPromoCampaignFields(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidPersonalPromoCampaignFields",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as CreatePersonalPromoCampaignDto;
          const { target, bannerId, partnerName } = dto;

          if (target === EPromoCampaignTarget.ALL_NEW_PERSONAL || target === EPromoCampaignTarget.GENERAL) {
            return true;
          }

          return bannerId === UNDEFINED_VALUE && partnerName === UNDEFINED_VALUE;
        },
        defaultMessage(): string {
          return "Banner and partner name are only allowed for all-new-personal or general promo campaigns.";
        },
      },
    });
  };
}
