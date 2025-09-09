import { ECompanyActivitySphere, ECompanyEmployeesNumber, ECompanyStatus } from "src/modules/companies/common/enums";
import { EExtCountry } from "src/modules/addresses/common/enums";

export interface ICompaniesCsv {
  name: string;
  status: ECompanyStatus;
  country: EExtCountry;
  platformId: string;
  phoneNumber: string;
  contactEmail: string;
  activitySphere: ECompanyActivitySphere | null;
  employeesNumber: ECompanyEmployeesNumber;
}
