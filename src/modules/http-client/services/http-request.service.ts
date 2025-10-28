import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";
import { NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS, UNDEFINED_VALUE } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { NaatiCpnQueryDto } from "src/modules/naati/common/dto";
import { INaatiApiResponseOutput } from "src/modules/naati/common/outputs";
import { ErrorWithCause } from "src/modules/http-client/common/interfaces";
import { EHttpClientErrorCodes } from "src/modules/http-client/common/enums";

@Injectable()
export class HttpRequestService {
  private readonly lokiLogger = new LokiLogger(HttpRequestService.name);
  private readonly API_KEY: string;
  private readonly API_SECRET: string;
  private readonly BACKEND_UTILITY_NAATI_URL: string;
  private readonly DEFAULT_USER_AGENT: string =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

  private readonly DEFAULT_HEADERS: Record<string, string> = {
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
    "X-Service-Name": "fleet",
    "User-Agent": this.DEFAULT_USER_AGENT,
  };

  public constructor(private readonly configService: ConfigService) {
    this.API_KEY = this.configService.getOrThrow<string>("internalApiKey");
    this.API_SECRET = this.configService.getOrThrow<string>("internalApiSecret");
    this.BACKEND_UTILITY_NAATI_URL = this.configService.getOrThrow<string>("backEndUtilityNaatiUrl");
  }

  public async sendCpnVerificationRequest(dto: NaatiCpnQueryDto): Promise<INaatiApiResponseOutput> {
    const requestType: string = "cpn-verification";
    const url: string = this.BACKEND_UTILITY_NAATI_URL;
    const timestamp = new Date().toISOString();
    const payload = { cpn: dto.cpn, timestamp };
    const signature = this.generateSignature(payload);

    const options: RequestInit = {
      method: "POST",
      headers: {
        ...this.DEFAULT_HEADERS,
        "X-API-Key": this.API_KEY,
        "X-Request-Timestamp": timestamp,
        "X-Request-Signature": signature,
      },
      body: JSON.stringify({ cpn: dto.cpn }),
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    };

    return await this.sendRequest<INaatiApiResponseOutput>(url, options, requestType);
  }

  private async sendRequest<T>(url: string, options: RequestInit, requestType: string): Promise<T> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        this.lokiLogger.error(
          `Failed to send ${requestType} request, status: ${response.status}, message: ${response.statusText}`,
        );
        throw new Error();
      }

      return (await response.json()) as T;
    } catch (error) {
      const originalError = error as ErrorWithCause;

      if (originalError.cause) {
        const networkDetails = originalError.cause;
        this.lokiLogger.error(
          `Network error details in ${requestType} request: ${JSON.stringify({
            code: "code" in networkDetails ? networkDetails.code : UNDEFINED_VALUE,
            syscall: "syscall" in networkDetails ? networkDetails.syscall : UNDEFINED_VALUE,
            address: "address" in networkDetails ? networkDetails.address : UNDEFINED_VALUE,
            port: "port" in networkDetails ? networkDetails.port : UNDEFINED_VALUE,
          })}`,
        );
      }

      this.lokiLogger.error(`Failed to send ${requestType} request.`);
      throw new ServiceUnavailableException(EHttpClientErrorCodes.REQUEST_SEND_FAILED);
    }
  }

  private generateSignature(payload: { cpn: string; timestamp: string }): string {
    const data = JSON.stringify(payload);

    return createHmac("sha256", this.API_SECRET).update(data).digest("hex");
  }
}
