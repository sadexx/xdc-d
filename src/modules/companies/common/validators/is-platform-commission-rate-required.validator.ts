import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";
import { CreateCompanyDto } from "src/modules/companies/common/dto";
import { ECompanyType } from "src/modules/companies/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

/**
 * Validates that platformCommissionRate is provided when companyType is 'corporate-interpreting-providers'.
 *
 * @param validationOptions The validation options.
 * @returns A function that will be called to validate the value.
 */
export function IsPlatformCommissionRateRequired(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isPlatformCommissionRateRequired",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const object = args.object as CreateCompanyDto;
          const companyType = object.companyType;
          const platformCommissionRate = object.platformCommissionRate;

          if (companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
            return platformCommissionRate !== UNDEFINED_VALUE && platformCommissionRate !== null;
          }

          return true;
        },
        defaultMessage(): string {
          return `Platform commission rate is required when company type is '${ECompanyType.CORPORATE_INTERPRETING_PROVIDERS}'`;
        },
      },
    });
  };
}
