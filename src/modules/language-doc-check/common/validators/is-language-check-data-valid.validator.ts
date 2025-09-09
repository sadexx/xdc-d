import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateLanguageDocCheckDto } from "src/modules/language-doc-check/common/dto";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export function IsLanguageCheckDataValid(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isLanguageCheckDataValid",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: ELanguages, args: ValidationArguments): boolean {
          const dto = args.object as CreateLanguageDocCheckDto;
          const pteDataProvided = dto.pteScoreReportCode || dto.pteTestRegistrationId;

          if (value && pteDataProvided) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return "Either provide complete PTE data or provide language, but not both.";
        },
      },
    });
  };
}
