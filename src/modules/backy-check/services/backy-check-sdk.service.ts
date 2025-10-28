import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  IBackycheckApiData,
  IGetCheckSummary,
  IStartWWCCReq,
  IStartWWCCRes,
} from "src/modules/backy-check/common/interfaces";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
} from "src/common/constants";
import { EBackyCheckErrorCodes } from "src/modules/backy-check/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class BackyCheckSdkService {
  private readonly lokiLogger = new LokiLogger(BackyCheckSdkService.name);

  private baseUrl: string;
  private accessToken: string;
  private tokenExpires: number;
  private userId: string;

  public constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async authCheck(): Promise<void> {
    if (
      !this.baseUrl ||
      !this.userId ||
      !this.accessToken ||
      !this.tokenExpires ||
      Date.now() + NUMBER_OF_MILLISECONDS_IN_MINUTE > this.tokenExpires
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
      const rawText: string = await response.text();
      let responseMessage: string | Record<string, unknown>;
      try {
        responseMessage = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        responseMessage = rawText;
      }

      this.lokiLogger.error(`HTTP error! Status: ${response.status}, error: ${JSON.stringify(responseMessage)}`);
      throw new ServiceUnavailableException(EBackyCheckErrorCodes.SDK_HTTP_ERROR);
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

    (options.headers as Record<string, string>)["Authorization"] = `Bearer ${this.accessToken}`;

    return await this.makeRequest(`${this.baseUrl}${path}`, options);
  }

  private async auth(): Promise<void> {
    try {
      const { baseUrl, clientId, clientSecret } = this.configService.getOrThrow<IBackycheckApiData>("backyCheck");

      const authResponse = await this.makeRequest(`${baseUrl}/auth/login/s2s`, {
        method: "POST",
        body: JSON.stringify({ clientId, clientSecret }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const token: { access_token: string; userId: string } = (await authResponse.json()) as {
        access_token: string;
        userId: string;
      };
      const payload = this.jwtService.decode<{ exp: number }>(token.access_token);

      this.baseUrl = baseUrl;
      this.accessToken = token.access_token;
      this.userId = token.userId;
      this.tokenExpires = payload.exp * NUMBER_OF_MILLISECONDS_IN_SECOND;
    } catch (error) {
      this.lokiLogger.error(`BackyCheck auth error! Error: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EBackyCheckErrorCodes.SDK_AUTH_ERROR);
    }
  }

  public async startWWCC(requestData: IStartWWCCReq): Promise<IStartWWCCRes> {
    await this.authCheck();

    const response = await this.makeRequestProtected(`/v1/check/wwc`, {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        UserID: this.userId,
      },
    });

    return (await response.json()) as IStartWWCCRes;
  }

  public async getChecksSummary(lastNHours: number = 12): Promise<IGetCheckSummary> {
    await this.authCheck();

    const response = await this.makeRequestProtected(`/v1/check/get-checks-summary/${lastNHours}`, {
      method: "GET",
      headers: {
        UserID: this.userId,
      },
    });

    return (await response.json()) as IGetCheckSummary;
  }
}
