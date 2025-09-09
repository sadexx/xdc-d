import { EUserTitle } from "src/modules/users/common/enums";

export interface ICorporateTabData {
  title?: EUserTitle | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
}
