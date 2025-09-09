import { EAppointmentCommunicationType, EAppointmentTopic } from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export interface IOnDemandInvitationOutput {
  invitationLink: string;
  appointmentOrderId: string;
  appointmentId: string;
  clientName: string;
  clientPlatformId: string;
  clientCompanyName: string;
  schedulingDurationMin: number;
  communicationType: EAppointmentCommunicationType;
  topic: EAppointmentTopic;
  languageFrom: ELanguages;
  languageTo: ELanguages;
}
