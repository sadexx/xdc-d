export interface IStartWWCCReq {
  firstName: string;
  middleName: string;
  surname: string;
  email: string;
  DOB: string;
  cardNumber: string;
  cardExpiryDate: Date | string;
  cardStateIssue: string;
  dependantClientID: string;
  costCentreId: string;
}
