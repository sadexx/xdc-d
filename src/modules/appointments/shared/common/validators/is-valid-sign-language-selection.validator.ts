import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { ESignLanguages } from "src/modules/interpreters/profile/common/enum";
import {
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
} from "src/modules/appointments/appointment/common/dto";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";

export function IsValidSignLanguageSelection(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidSignLanguageSelection",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: string, args: ValidationArguments) {
          const dto = args.object as
            | CreateFaceToFaceAppointmentDto
            | CreateVirtualAppointmentDto
            | CreateDraftAppointmentsDto;
          const isLanguageFromSign = ESignLanguages.includes(dto.languageFrom);
          const isLanguageToSign = ESignLanguages.includes(dto.languageTo);
          const isAudioTypeAndOneLanguagesSign =
            dto.communicationType === EAppointmentCommunicationType.AUDIO && (isLanguageFromSign || isLanguageToSign);

          if (isAudioTypeAndOneLanguagesSign) {
            return false;
          }

          return !(isLanguageFromSign && isLanguageToSign);
        },
        defaultMessage() {
          return "Invalid language selection: audio type is incompatible with sign language, and both languages cannot be sign languages.";
        },
      },
    });
  };
}
