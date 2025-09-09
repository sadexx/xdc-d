import { IAwsBaseConfig } from "src/modules/aws/config/common/interface";

export interface IAwsConfigPinpoint extends IAwsBaseConfig {
  pinpointApplicationId: string;
}
