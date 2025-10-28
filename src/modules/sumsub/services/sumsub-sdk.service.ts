import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ISumSubAccessTokenResponse,
  ISumSubApiData,
  ISumSubApplicantDataResponse,
} from "src/modules/sumsub/common/interfaces";
import { NUMBER_OF_MILLISECONDS_IN_SECOND, NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";
import * as crypto from "crypto";
import { ESumSubErrorCodes } from "src/modules/sumsub/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class SumSubSdkService {
  private readonly lokiLogger = new LokiLogger(SumSubSdkService.name);

  private readonly baseUrl: string;
  private readonly requestPath: string;
  private readonly apiToken: string;
  private readonly apiKey: string;
  private readonly TTL_IN_SECS = 600;

  constructor(private readonly configService: ConfigService) {
    const { baseUrl, requestPath, apiToken, apiKey } = this.configService.getOrThrow<ISumSubApiData>("sumsub");
    this.baseUrl = baseUrl;
    this.requestPath = requestPath;
    this.apiToken = apiToken;
    this.apiKey = apiKey;
  }

  public async getApplicantData(applicantId: string): Promise<ISumSubApplicantDataResponse> {
    const requestParams = `/resources/applicants/${applicantId}/one`;
    const response = await this.makeRequest(requestParams, "GET");

    const applicantDataResponse: ISumSubApplicantDataResponse = (await response.json()) as ISumSubApplicantDataResponse;

    return applicantDataResponse;
  }

  public async fetchAccessToken(clientId: string, levelName: string): Promise<string> {
    const requestParams = `${this.requestPath}?userId=${encodeURIComponent(clientId)}&levelName=${encodeURIComponent(
      levelName,
    )}&ttlInSecs=${this.TTL_IN_SECS}`;
    const response = await this.makeRequest(requestParams, "POST");

    const accessTokenResponse: ISumSubAccessTokenResponse = (await response.json()) as ISumSubAccessTokenResponse;

    return accessTokenResponse.token;
  }

  public async resetApplicant(applicantId: string): Promise<void> {
    const requestParams = `/resources/applicants/${applicantId}/reset`;
    await this.makeRequest(requestParams, "POST");
  }

  private async makeRequest(requestParams: string, method: string): Promise<Response> {
    const timestamp = Math.floor(Date.now() / NUMBER_OF_MILLISECONDS_IN_SECOND).toString();
    const signaturePayload = timestamp + method + requestParams;
    const signature = crypto.createHmac("sha256", this.apiKey).update(signaturePayload).digest("hex");

    const response = await fetch(this.baseUrl + requestParams, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": this.apiToken,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": timestamp,
      },
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!response.ok) {
      this.lokiLogger.error(`Error from Sumsub: ${response.statusText}`);
      throw new ServiceUnavailableException(ESumSubErrorCodes.SUMSUB_ERROR);
    }

    return response;
  }
}
