import { IAwsBaseConfig } from "src/modules/aws/config/common/interface";

export interface IAwsConfigS3 extends IAwsBaseConfig {
  s3BucketName: string;
  s3MediaBucketName: string;
}
