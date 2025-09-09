import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";

export type AdminIdentifierInput = { userRoleId?: string } | { id?: string };

export type TUserRoleMapping = Pick<UserRole, "id" | "operatedByCompanyId" | "operatedByMainCorporateCompanyId">;

export type TCompanyMapping = Pick<Company, "id" | "operatedByMainCompanyId">;

export type TAppointmentMapping = Pick<
  Appointment,
  "id" | "clientId" | "operatedByCompanyId" | "operatedByMainCorporateCompanyId"
>;

export type TOperationExecutor = {
  id?: string;
  userRoleId?: string;
  operatedByCompanyId: string;
};

export type TTargetEntity = {
  id: string;
  operatedByCompanyId: string;
  operatedByMainCorporateCompanyId: string | null;
};

export type TCompanyOwned = {
  id: string;
  operatedByCompanyId: string;
};

export type TTargetEntityMapping =
  | { id: string; operatedByMainCompanyId: string }
  | { id: string; operatedByMainCorporateCompanyId: string | null };
