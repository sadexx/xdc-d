import { RegisterUserDto } from "src/modules/auth/common/dto";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";

export interface IMockRegistration {
  dto: RegisterUserDto;
  currentClient: ICurrentClientData;
}
