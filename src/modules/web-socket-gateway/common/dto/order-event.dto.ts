import { MessageEventDto } from "src/modules/web-socket-gateway/common/dto";

export class OrderEventDto extends MessageEventDto {
  id?: string;
  latitude?: number;
  longitude?: number;
}
