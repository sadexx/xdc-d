import { CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";

export interface ICreateCompanyAdminData {
  role: (typeof CORPORATE_SUPER_ADMIN_ROLES)[number];
  email: string;
  phoneNumber?: string;
}
