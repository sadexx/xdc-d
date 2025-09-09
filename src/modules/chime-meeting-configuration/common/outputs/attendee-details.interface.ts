import { GetAttendeeCommandOutput } from "@aws-sdk/client-chime-sdk-meetings";
import { IInvitedInternalUser, IInvitedParticipant } from "src/modules/chime-meeting-configuration/common/interfaces";

export interface IAttendeeDetailsOutput {
  Attendee: GetAttendeeCommandOutput;
  attendeeDetails: IInvitedInternalUser | IInvitedParticipant;
}
