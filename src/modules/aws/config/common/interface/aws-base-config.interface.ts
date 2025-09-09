import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";

export interface IAwsBaseConfig {
  region: string;
  credentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider;
}
