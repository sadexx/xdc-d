import { IAwsBaseConfig } from "src/modules/aws/config/common/interface";

export interface IAwsConfigMessagingSdk extends IAwsBaseConfig {
  chimeMessagingControlRegion: string;
}
