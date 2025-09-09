import { EUserRoleName } from "src/modules/users/common/enums";

export interface ICreateAppointmentCancellationInfo {
  appointmentAdminInfo: { id: string };
  cancelledById: string;
  cancelledByPlatformId: string;
  cancelledByFirstName: string;
  cancelledByPreferredName?: string | null;
  roleName: EUserRoleName;
  cancellationReason?: string | null;
}
