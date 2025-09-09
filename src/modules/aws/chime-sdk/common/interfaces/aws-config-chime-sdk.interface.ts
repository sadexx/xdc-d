import { IAwsBaseConfig } from "src/modules/aws/config/common/interface";

export interface IAwsConfigChimeSdk extends IAwsBaseConfig {
  awsAccountId: string;
  chimeControlRegion: string;
  sipMediaApplicationId: string;
  s3BucketName: string;
}
