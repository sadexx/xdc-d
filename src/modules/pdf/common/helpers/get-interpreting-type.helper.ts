import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";

export function getInterpretingType(interpretingTypeEnum: EAppointmentInterpreterType | null | undefined): string {
  if (interpretingTypeEnum === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
    return "Professional Interpreting";
  } else if (interpretingTypeEnum === EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER) {
    return "Language Buddy";
  } else {
    return "";
  }
}
