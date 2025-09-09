export interface ICreateAppointmentOrderGroup {
  sameInterpreter: boolean;
  operatedByCompanyName: string;
  operatedByCompanyId: string;
  operatedByMainCorporateCompanyName: string | null;
  operatedByMainCorporateCompanyId: string | null;
  isCompanyHasInterpreters: boolean;
  acceptOvertimeRates: boolean;
  timezone: string;
}
