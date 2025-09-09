import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
} from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { IIeltsApiData, IResultVerification, ITokenResponse } from "src/modules/ielts/common/interfaces";

@Injectable()
export class IeltsSdkService {
  private readonly logger = new LokiLogger(IeltsSdkService.name);
  private baseUrl: string;
  private tokenType: string;
  private accessToken: string;
  private tokenExpires: number;

  public constructor(private readonly configService: ConfigService) {}

  private async authCheck(): Promise<void> {
    if (
      !this.baseUrl ||
      !this.tokenType ||
      !this.accessToken ||
      !this.tokenExpires ||
      this.tokenExpires < Date.now() + NUMBER_OF_MILLISECONDS_IN_MINUTE
    ) {
      await this.auth();
    }
  }

  private async makeRequest(url: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!response.ok) {
      let responseMessage: string;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        responseMessage = await response.json();
      } catch (error) {
        this.logger.error(`Error in makeRequest: ${(error as Error).message}, ${(error as Error).stack}`);
        responseMessage = await response.text();
      }

      throw new ServiceUnavailableException(
        `HTTP error! Status: ${response.status}, error: ${JSON.stringify(responseMessage)}`,
      );
    }

    return response;
  }

  private async makeRequestProtected(path: string, options?: RequestInit): Promise<Response> {
    if (!options) {
      options = {};
    }

    if (!options?.headers) {
      options.headers = {};
    }

    (options.headers as Record<string, string>)["Authorization"] = `${this.tokenType} ${this.accessToken}`;

    return await this.makeRequest(`${this.baseUrl}${path}`, options);
  }

  private async auth(): Promise<void> {
    try {
      const { baseUrl, clientId, clientSecret } = this.configService.getOrThrow<IIeltsApiData>("ielts");

      const tokenRequestBody = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=${encodeURIComponent("client_credentials")}`;

      const tokenResponse = await this.makeRequest(`${baseUrl}/cambridge.id/token`, {
        method: "POST",
        body: tokenRequestBody,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const token: ITokenResponse = (await tokenResponse.json()) as ITokenResponse;

      this.baseUrl = baseUrl;
      this.tokenType = token.token_type;
      this.accessToken = token.access_token;
      this.tokenExpires = Date.now() + Number(token.expires_in) * NUMBER_OF_MILLISECONDS_IN_SECOND;
    } catch (error) {
      throw new ServiceUnavailableException(`IELTS auth error! Error: ${(error as Error).message}`);
    }
  }

  public async resultVerification(trfNumber: string): Promise<IResultVerification> {
    await this.authCheck();

    const response = await this.makeRequestProtected(`/ielts/result-verification?trfNumber=${trfNumber}`);

    const responseJson: IResultVerification = (await response.json()) as IResultVerification;

    return responseJson;
  }
}
