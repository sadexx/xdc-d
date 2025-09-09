import { EExtAbnStatus, EExtAbnTypeCode } from "src/modules/abn/common/enums";

export interface IAbnApiResponse {
  Abn: string;
  AbnStatus: EExtAbnStatus;
  AbnStatusEffectiveFrom: string;
  Acn: string;
  AddressDate: string | null;
  AddressPostcode: string;
  AddressState: string;
  BusinessName: string[];
  EntityName: string;
  EntityTypeCode: EExtAbnTypeCode;
  EntityTypeName: string;
  Gst: string | null;
  Message: string;
}
