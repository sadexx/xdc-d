export interface ICorporateCaptureContext {
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  clientCountry: string;
  interpreterCountry: string | null;
  isSameCorporateCompany: boolean;
}
