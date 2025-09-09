import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { CreateInterpreterRecommendationDto } from "src/modules/interpreters/questionnaire/common/dto";

export function IsRecommendationContactProvided(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isRecommendationContactProvided",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateInterpreterRecommendationDto;

          return Boolean(dto.recommenderEmail?.trim() || dto.recommenderPhoneNumber?.trim());
        },
        defaultMessage() {
          return "Either an email or a phone number must be provided.";
        },
      },
    });
  };
}
