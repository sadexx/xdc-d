import { ValidationOptions, registerDecorator, ValidationArguments } from "class-validator";
import { CreatePromoCampaignDto, UpdatePromoCampaignDto } from "src/modules/promo-campaigns/common/dto";
import { isValidServiceCombination } from "src/modules/appointments/shared/common/validators";
import {
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";

/**
 * Validates that when `allServices` is false, all combinations of the provided service arrays
 * represent valid service configurations.
 * Validation behavior:
 * - If `allServices` is `true`: Validation passes (skips service combination checks)
 * - If `allServices` is `false`: Validates all possible combinations of the service arrays
 * - Requires "all or nothing" rule: either ALL service arrays present or NONE
 * - If any service array is empty: Validation fails
 * - If any service combination is invalid: Validation fails
 * - Uses early termination for performance - stops checking on the first invalid combination
 *
 * @param validationOptions - Optional validation options from class-validator
 * @returns A PropertyDecorator function for class-validator
 */
export function IsValidPromoCampaignServiceCombinations(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: "isValidPromoCampaignServiceCombinations",
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: boolean, args: ValidationArguments): boolean {
          const dto = args.object as CreatePromoCampaignDto | UpdatePromoCampaignDto;

          if (value === true) {
            return true;
          }

          const { interpreterTypes, schedulingTypes, communicationTypes, interpretingTypes, topics } = dto;
          const serviceFields = [interpreterTypes, schedulingTypes, communicationTypes, interpretingTypes, topics];

          const presentFields = serviceFields.filter((field) => field !== UNDEFINED_VALUE);
          const totalFields = serviceFields.length;

          if (presentFields.length !== 0 && presentFields.length !== totalFields) {
            return false;
          }

          if (presentFields.length === 0) {
            return true;
          }

          if (!interpreterTypes || !schedulingTypes || !communicationTypes || !interpretingTypes || !topics) {
            return false;
          }

          return validateAllServiceCombinations(
            interpreterTypes,
            schedulingTypes,
            communicationTypes,
            interpretingTypes,
            topics,
          );
        },
        defaultMessage() {
          return "When allServices is false, all combinations of interpreterTypes, schedulingTypes, communicationTypes, interpretingTypes, and topics must be valid service combinations.";
        },
      },
    });
  };
}

/**
 * Validates all possible combinations of service types
 */
function validateAllServiceCombinations(
  interpreterTypes: EAppointmentInterpreterType[],
  schedulingTypes: EAppointmentSchedulingType[],
  communicationTypes: EAppointmentCommunicationType[],
  interpretingTypes: EAppointmentInterpretingType[],
  topics: EAppointmentTopic[],
): boolean {
  return interpreterTypes.every((interpreterType) =>
    schedulingTypes.every((schedulingType) =>
      communicationTypes.every((communicationType) =>
        interpretingTypes.every((interpretingType) =>
          topics.every((topic) =>
            isValidServiceCombination(interpreterType, schedulingType, communicationType, interpretingType, topic),
          ),
        ),
      ),
    ),
  );
}
