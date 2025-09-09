import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import {
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
} from "src/modules/appointments/appointment/common/dto";
import { CreateDraftAppointmentsDto } from "src/modules/draft-appointments/common/dto";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ValidServiceCombination } from "src/modules/appointments/shared/common/types";
import { AuditPriceDto, CalculatePriceDto } from "src/modules/rates/common/dto";

/**
 * Validates that the combination of interpreterType, schedulingType, communicationType,
 * and interpretingType represents a valid service configuration.
 *
 * This decorator should be applied to any property in a DTO that contains these four fields.
 *
 * @param validationOptions The validation options.
 * @returns A function that will be called to validate the service combination.
 */
export function IsValidServiceCombination(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidServiceCombination",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as
            | CreateVirtualAppointmentDto
            | CreateFaceToFaceAppointmentDto
            | CreateDraftAppointmentsDto
            | AuditPriceDto
            | CalculatePriceDto;

          const { interpreterType, schedulingType, communicationType, interpretingType, topic } = dto;

          return isValidServiceCombination(interpreterType, schedulingType, communicationType, interpretingType, topic);
        },
        defaultMessage() {
          return "Invalid service combination. The combination of interpreterType, schedulingType, communicationType, and interpretingType is not supported.";
        },
      },
    });
  };
}

/**
 * Checks if the given service combination is valid.
 *
 * This function takes in five parameters - interpreterType, schedulingType, communicationType, interpretingType, and topic.
 * It then checks if the combination of these five parameters represents a valid service configuration.
 * The valid service combinations are hardcoded in this function.
 *
 * @param interpreterType The interpreter type of the appointment.
 * @param schedulingType The scheduling type of the appointment.
 * @param communicationType The communication type of the appointment.
 * @param interpretingType The interpreting type of the appointment.
 * @param topic The topic of the appointment.
 * @returns true if the combination is valid, false otherwise.
 */
export function isValidServiceCombination(
  interpreterType: EAppointmentInterpreterType,
  schedulingType: EAppointmentSchedulingType,
  communicationType: EAppointmentCommunicationType,
  interpretingType: EAppointmentInterpretingType,
  topic: EAppointmentTopic,
): boolean {
  const validCombinations = new Set<ValidServiceCombination>([
    "ind-professional-interpreter:on-demand:audio:consecutive",
    "ind-professional-interpreter:on-demand:video:consecutive",
    "ind-professional-interpreter:pre-booked:audio:consecutive",
    "ind-professional-interpreter:pre-booked:video:consecutive",
    "ind-professional-interpreter:on-demand:face-to-face:consecutive",
    "ind-professional-interpreter:pre-booked:face-to-face:consecutive",
    "ind-professional-interpreter:pre-booked:face-to-face:sign-language",
    "ind-professional-interpreter:on-demand:face-to-face:sign-language",
    "ind-professional-interpreter:pre-booked:video:sign-language",
    "ind-professional-interpreter:on-demand:video:sign-language",
    "ind-professional-interpreter:pre-booked:face-to-face:simultaneous",
    "ind-professional-interpreter:pre-booked:face-to-face:escort",

    "ind-language-buddy-interpreter:on-demand:audio:consecutive:general",
    "ind-language-buddy-interpreter:on-demand:video:consecutive:general",
    "ind-language-buddy-interpreter:pre-booked:audio:consecutive:general",
    "ind-language-buddy-interpreter:pre-booked:video:consecutive:general",
    "ind-language-buddy-interpreter:on-demand:face-to-face:consecutive:general",
    "ind-language-buddy-interpreter:pre-booked:face-to-face:consecutive:general",
  ]);

  let combinationKey: string = `${interpreterType}:${schedulingType}:${communicationType}:${interpretingType}`;

  if (interpreterType === EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER) {
    combinationKey = `${combinationKey}:${topic}`;
  }

  return validCombinations.has(combinationKey as ValidServiceCombination);
}
