export interface IAppointmentParticipantInvitationOutput {
  clientFirstName: string;
  clientLastName: string;
  platformId: string;
  scheduledStartTime: Date;
  languageFrom: string;
  languageTo: string;
  topic: string;
  schedulingDurationMin: number;
  meetingUrl: string;
}
