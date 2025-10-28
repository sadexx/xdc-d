import { Injectable } from "@nestjs/common";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { AWS_MAX_ATTEMPTS, IS_LOCAL } from "src/common/constants";
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";

@Injectable()
export class AwsConfigService {
  private readonly nodeHttpHandler: NodeHttpHandler;

  constructor() {
    this.nodeHttpHandler = new NodeHttpHandler({
      socketTimeout: 25000,
      connectionTimeout: 5000,
    });
  }

  public getStandardClientConfig<T>(
    region: string,
    credentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider,
  ): T {
    const config = {
      region: region,
    } as T;

    if (IS_LOCAL) {
      return {
        ...config,
        credentials: credentials,
        requestHandler: this.nodeHttpHandler,
        maxAttempts: AWS_MAX_ATTEMPTS,
      };
    }

    return config;
  }
}
