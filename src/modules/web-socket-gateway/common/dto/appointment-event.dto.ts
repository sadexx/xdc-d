import { MessageEventDto } from "src/modules/web-socket-gateway/common/dto";

export class AppointmentEventDto extends MessageEventDto {
  appointmentId: string;
  isViewConfirmed?: boolean;
}
