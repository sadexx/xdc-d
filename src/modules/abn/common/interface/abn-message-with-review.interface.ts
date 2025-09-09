import { EExtAbnStatus, EExtAbnTypeCode } from "src/modules/abn/common/enums";

export interface IAbnMessageWithReview {
  abnNumber: string;
  abnStatus: EExtAbnStatus;
  abnStatusEffectiveFrom: string;
  acn: string;
  addressDate: string | null;
  addressPostcode: string;
  addressState: string;
  businessName: string[] | null;
  fullName: string;
  typeCode: EExtAbnTypeCode;
  typeName: string;
  gst: string | null;
  message: string;
}
