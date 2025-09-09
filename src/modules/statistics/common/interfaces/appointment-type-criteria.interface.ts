import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";

export interface IAppointmentTypeCriteria {
  communicationType?: EAppointmentCommunicationType;
  schedulingType?: EAppointmentSchedulingType;
}
