import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
} from "src/common/constants";
import { IPaypalApiData } from "src/modules/paypal/common/interfaces/paypal-api-data.interface";
import {
  IMakePayPalTransferData,
  IPayoutResponse,
  IPaypalAuthResponse,
  IProfileInformationResponse,
} from "src/modules/paypal/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { EPaypalErrorCodes } from "src/modules/paypal/common/enums";

@Injectable()
export class PaypalSdkService {
  private readonly lokiLogger = new LokiLogger(PaypalSdkService.name);
  private readonly paypalConfig: IPaypalApiData;
  private tokenType: string;
  private accessToken: string;
  private tokenExpires: number;

  public constructor(private readonly configService: ConfigService) {
    this.paypalConfig = this.configService.getOrThrow<IPaypalApiData>("paypal");
  }

  /**
   * Ensures valid access token, refreshing if needed.
   */
  private async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    const needsRefresh =
      !this.accessToken ||
      !this.tokenType ||
      !this.tokenExpires ||
      this.tokenExpires < now + NUMBER_OF_MILLISECONDS_IN_MINUTE;

    if (needsRefresh) {
      await this.authenticate();
    }
  }

  /**
   * Authenticates using client credentials grant.
   * @throws {ServiceUnavailableException} On auth failure.
   */
  private async authenticate(): Promise<void> {
    try {
      const { clientId, clientSecret, baseUrl } = this.paypalConfig;
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const response = await this.makeRequest(`${baseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: "grant_type=client_credentials",
      });

      const token = (await response.json()) as IPaypalAuthResponse;

      this.tokenType = token.token_type;
      this.accessToken = token.access_token;
      this.tokenExpires = Date.now() + Number(token.expires_in) * NUMBER_OF_MILLISECONDS_IN_SECOND;
    } catch (error) {
      this.lokiLogger.error(`PayPal authentication failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EPaypalErrorCodes.PAYPAL_AUTH_FAILED);
    }
  }

  /**
   * Authenticates using authorization code grant.
   * @param authorizationCode - The OAUTH code.
   * @throws {ServiceUnavailableException} On auth failure.
   */
  private async authenticateAuthorizationCode(authorizationCode: string): Promise<IPaypalAuthResponse> {
    try {
      const { clientId, clientSecret, baseUrl } = this.paypalConfig;
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const response = await this.makeRequest(`${baseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: `grant_type=authorization_code&code=${authorizationCode}`,
      });

      return (await response.json()) as IPaypalAuthResponse;
    } catch (error) {
      this.lokiLogger.error(`PayPal authentication code failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(EPaypalErrorCodes.PAYPAL_AUTH_FAILED);
    }
  }

  /**
   * Performs a protected API request to PayPal, ensuring authentication.
   * @param path - The API endpoint path.
   * @param options - Fetch options.
   * @returns The response object
   * @throws {ServiceUnavailableException} On HTTP or auth errors.
   */
  private async makeProtectedRequest(path: string, options: RequestInit = {}): Promise<Response> {
    await this.ensureAuthenticated();

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `${this.tokenType} ${this.accessToken}`);

    return this.makeRequest(`${this.paypalConfig.baseUrl}${path}`, { ...options, headers });
  }

  /**
   * Performs an Api request to PayPal (public or protected).
   * @param url - The full API url.
   * @param options - Fetch options.
   * @returns The response object
   * @throws {ServiceUnavailableException} On non-OK responses or auth errors.
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!response.ok) {
      const errorMessage = await this.parseErrorResponse(response);
      this.lokiLogger.error(`Paypal HTTP error! Status: ${response.status}, error: ${errorMessage}`);
      throw new ServiceUnavailableException(EPaypalErrorCodes.PAYPAL_HTTP_ERROR);
    }

    return response;
  }

  /**
   * Parses error from response.
   * @param response - The failed response.
   * @returns The error message as string.
   */
  private async parseErrorResponse(response: Response): Promise<string> {
    const clonedResponse = response.clone();
    try {
      const errorBody = (await clonedResponse.json()) as { message: string };

      return errorBody.message;
    } catch {
      return await response.text();
    }
  }

  /**
   * Retrieves the Paypal client profile using an authorization code.
   * @param authorizationCode - The OAUTH code.
   * @returns The profile information.
   * @throws {ServiceUnavailableException} On auth or request failure.
   */
  public async getClientProfile(authorizationCode: string): Promise<IProfileInformationResponse> {
    const token = await this.authenticateAuthorizationCode(authorizationCode);

    const response = await this.makeRequest(
      `${this.paypalConfig.baseUrl}/identity/openidconnect/userinfo?schema=openid`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `${token.token_type} ${token.access_token}`,
        },
      },
    );

    return (await response.json()) as IProfileInformationResponse;
  }

  /**
   * Creates a PayPal payout/transfer.
   * @param data - The data to perform transfer.
   * @returns The payout response.
   * @throws {ServiceUnavailableException} On request or auth failure.
   */
  async makeTransfer(data: IMakePayPalTransferData): Promise<IPayoutResponse> {
    const { isCorporate, platformId, idempotencyKey, fullAmount, currency, payerId } = data;

    const emailSubject = isCorporate ? `Transfer to company ${platformId}` : `Transfer by appointment ${platformId}`;

    const payoutData = {
      sender_batch_header: {
        email_subject: emailSubject,
        sender_batch_id: idempotencyKey,
      },
      items: [
        {
          recipient_type: "PAYPAL_ID",
          amount: {
            value: fullAmount,
            currency,
          },
          receiver: payerId,
          note: emailSubject,
          sender_item_id: "item_1",
        },
      ],
    };

    const response = await this.makeProtectedRequest(`/payments/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payoutData),
    });

    return (await response.json()) as IPayoutResponse;
  }
}
