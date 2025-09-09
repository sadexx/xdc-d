import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
} from "src/common/constants";
import { IResultVerification } from "src/modules/ielts/common/interfaces/result-verification.interface";
import { IPaypalApiData } from "src/modules/paypal/common/interfaces/paypal-api-data.interface";
import {
  IPayoutResponse,
  IPaypalAuthResponse,
  IProfileInformationResponse,
} from "src/modules/paypal/common/interfaces";
import { OldECurrencies } from "src/modules/payments/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class PaypalSdkService {
  private readonly logger = new LokiLogger(PaypalSdkService.name);
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
        const clonedResponse = response.clone();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        responseMessage = await clonedResponse.json();
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
      const { baseUrl, clientId, clientSecret } = this.configService.getOrThrow<IPaypalApiData>("paypal");

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const tokenResponse = await this.makeRequest(`${baseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: "grant_type=client_credentials",
      });

      const token: IPaypalAuthResponse = (await tokenResponse.json()) as IPaypalAuthResponse;

      this.baseUrl = baseUrl;
      this.tokenType = token.token_type;
      this.accessToken = token.access_token;
      this.tokenExpires = Date.now() + Number(token.expires_in) * NUMBER_OF_MILLISECONDS_IN_SECOND;
    } catch (error) {
      throw new ServiceUnavailableException(`Paypal auth error! Error: ${(error as Error).message}`);
    }
  }

  private async clientAuth(authorizationCode: string): Promise<IPaypalAuthResponse> {
    try {
      const { baseUrl, clientId, clientSecret } = this.configService.getOrThrow<IPaypalApiData>("paypal");

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const tokenResponse = await this.makeRequest(`${baseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: `grant_type=authorization_code&code=${authorizationCode}`,
      });

      const token: IPaypalAuthResponse = (await tokenResponse.json()) as IPaypalAuthResponse;

      return token;
    } catch (error) {
      throw new ServiceUnavailableException(`Paypal client auth error! Error: ${(error as Error).message}`);
    }
  }

  public async getClientProfile(authorizationCode: string): Promise<IProfileInformationResponse> {
    try {
      const { baseUrl } = this.configService.getOrThrow<IPaypalApiData>("paypal");

      const token = await this.clientAuth(authorizationCode);

      const profileResponse = await this.makeRequest(`${baseUrl}/identity/openidconnect/userinfo?schema=openid`, {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      });

      const profile: IProfileInformationResponse = (await profileResponse.json()) as IProfileInformationResponse;

      return profile;
    } catch (error) {
      throw new ServiceUnavailableException(`Paypal client auth error! Error: ${(error as Error).message}`);
    }
  }

  async makeTransfer(
    payerId: string,
    fullAmount: string,
    platformId: string,
    currency: OldECurrencies = OldECurrencies.AUD,
    isCorporate: boolean = false,
  ): Promise<IPayoutResponse> {
    await this.authCheck();

    let emailSubject = `Transfer by appointment ${platformId}`;

    if (isCorporate) {
      emailSubject = `Transfer to company ${platformId}`;
    }

    const payoutData = {
      sender_batch_header: {
        email_subject: emailSubject,
      },
      items: [
        {
          recipient_type: "PAYPAL_ID",
          amount: {
            value: fullAmount,
            currency: currency,
          },
          receiver: payerId,
          note: emailSubject,
          sender_item_id: "item_1",
        },
      ],
    };

    const response = await this.makeRequestProtected(`/payments/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payoutData),
    });

    const responseJson: IPayoutResponse = (await response.json()) as IPayoutResponse;

    return responseJson;
  }

  public async resultVerification(trfNumber: string): Promise<IResultVerification> {
    await this.authCheck();

    const response = await this.makeRequestProtected(`/ielts/result-verification?trfNumber=${trfNumber}`);

    const responseJson: IResultVerification = (await response.json()) as IResultVerification;

    return responseJson;
  }
}
