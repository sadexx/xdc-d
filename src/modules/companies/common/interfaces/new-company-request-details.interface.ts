import { EExtCountry } from "src/modules/addresses/common/enums";
import { ECompanyActivitySphere, ECompanyEmployeesNumber } from "src/modules/companies/common/enums";

export interface INewCompanyRequestDetails {
  companyName: string;
  phoneNumber: string;
  country: EExtCountry;
  contactPersonName: string;
  contactEmail: string;
  industry: ECompanyActivitySphere | null;
  numberOfEmployees: ECompanyEmployeesNumber;
}
