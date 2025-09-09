import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  IAddTabsToEnvelopeInterface,
  IChangeRecipientsInterface,
  ICreateEnvelopeInterface,
  ICreateTabInterface,
  IDocumentTabs,
  IDocusignApiDataInterface,
  IGetContractFileInterface,
  IGetDocumentsInterface,
  IGetEnvelopeRecipientInterface,
  IRecipientInterface,
  ISendEnvelopeInterface,
  ITokenResponseInterface,
  IUserInfoResponseInterface,
} from "src/modules/docusign/common/interfaces";
import { EContentType } from "src/modules/file-management/common/enums";
import {
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS,
} from "src/common/constants";

@Injectable()
export class DocusignSdkService {
  private baseURI: string;
  private accountId: string;
  private tokenType: string;
  private accessToken: string;
  private tokenExpires: number;

  public constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async authCheck(): Promise<void> {
    if (
      !this.baseURI ||
      !this.accountId ||
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
      const responseJson = (await response.json()) as { error?: string; body?: unknown };
      const body = (responseJson?.body as { error?: string; body?: unknown }) || responseJson;

      if (body) {
        if (body.error && body.error === "consent_required") {
          const { integrationKey, redirectURI, baseUrl } =
            this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

          const consentUrl =
            `${baseUrl}/oauth/auth?response_type=code&` +
            `scope=impersonation+signature&client_id=${integrationKey}&` +
            `redirect_uri=${redirectURI}`;

          throw new ServiceUnavailableException(
            `Please, Open the following URL in your browser to grant consent to the application: ${consentUrl}. After that, all must be OK`,
          );
        }
      }

      throw new ServiceUnavailableException(
        `HTTP error! Status: ${response.status}, error: ${JSON.stringify(responseJson)}`,
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

    return await this.makeRequest(`${this.baseURI}${path}`, options);
  }

  async auth(): Promise<void> {
    try {
      const { integrationKey, redirectURI, privateKey, userId, baseUrl } =
        this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

      await this.makeRequest(
        `${baseUrl}/oauth/auth?response_type=code&scope=impersonation&client_id=${integrationKey}&redirect_uri=${redirectURI}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const token = await this.jwtService.signAsync(
        {
          iss: integrationKey,
          sub: userId,
          aud: "account-d.docusign.com",
          scope: "signature impersonation",
        },
        {
          privateKey,
        },
      );

      const tokenRequestBody = `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(token)}`;

      const tokenResponse = await this.makeRequest(`${baseUrl}/oauth/token`, {
        method: "POST",
        body: tokenRequestBody,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const accessToken: ITokenResponseInterface = (await tokenResponse.json()) as ITokenResponseInterface;

      this.tokenType = accessToken.token_type;
      this.accessToken = accessToken.access_token;
      this.tokenExpires = Date.now() + accessToken.expires_in * NUMBER_OF_MILLISECONDS_IN_SECOND;

      if (!this.baseURI || !this.accountId) {
        const userInfoResponse = await this.makeRequest(`${baseUrl}/oauth/userinfo`, {
          headers: {
            Authorization: `${accessToken.token_type} ${accessToken.access_token}`,
          },
        });

        const userInfo: IUserInfoResponseInterface = (await userInfoResponse.json()) as IUserInfoResponseInterface;

        this.baseURI = userInfo.accounts[0].base_uri;
        this.accountId = userInfo.accounts[0].account_id;
      }
    } catch (error) {
      throw new ServiceUnavailableException(`DocuSign auth error! Error: ${(error as Error).message}`);
    }
  }

  async createEnvelope(
    templateId: string,
    signerEmail: string,
    signerName: string,
    secondSignerEmail?: string | null,
    secondSignerName?: string | null,
  ): Promise<ICreateEnvelopeInterface> {
    await this.authCheck();

    const requestData = {
      templateId,
      templateRoles: [
        {
          email: signerEmail,
          name: signerName,
          roleName: "signer",
        },
      ],
      status: "created",
    };

    if (secondSignerEmail && secondSignerName) {
      requestData.templateRoles.push({
        email: secondSignerEmail,
        name: secondSignerName,
        roleName: "second_signer",
      });
    }

    const response = await this.makeRequestProtected(`/restapi/v2.1/accounts/${this.accountId}/envelopes`, {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async getEnvelopeRecipient(envelopeId: string): Promise<string> {
    await this.authCheck();

    const response = await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
    );

    const responseJson: IGetEnvelopeRecipientInterface = (await response.json()) as IGetEnvelopeRecipientInterface;

    return responseJson.signers[0].recipientId;
  }

  async getEnvelopeSigners(envelopeId: string): Promise<IRecipientInterface[]> {
    await this.authCheck();

    const response = await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients`,
    );

    const responseJson: IGetEnvelopeRecipientInterface = (await response.json()) as IGetEnvelopeRecipientInterface;

    return responseJson.signers;
  }

  async addTabsToEnvelope(
    envelopeId: string,
    recipientId: string,
    tabs: ICreateTabInterface[],
  ): Promise<IAddTabsToEnvelopeInterface> {
    await this.authCheck();

    const response = await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/recipients/${recipientId}/tabs`,
      {
        method: "POST",
        body: JSON.stringify({
          textTabs: tabs,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async sendEnvelope(envelopeId: string): Promise<ISendEnvelopeInterface> {
    await this.authCheck();

    const requestData = {
      status: "sent",
    };

    const response = await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        method: "PUT",
        body: JSON.stringify(requestData),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async getDocuments(envelopeId: string): Promise<IGetDocumentsInterface> {
    await this.authCheck();
    const response = await this.makeRequestProtected(
      `/restapi/v2/accounts/${this.accountId}/envelopes/${envelopeId}/documents`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async getContractFile(envelopeId: string, documentId: string): Promise<IGetContractFileInterface> {
    await this.authCheck();
    const response = await this.makeRequestProtected(
      `/restapi/v2/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${documentId}?certificate=true`,
    );

    if (response.body && response.body instanceof ReadableStream) {
      return {
        data: response.body,
        contentType: response.headers.get("content-type") as EContentType,
        contentLength: Number(response.headers.get("content-length")),
      };
    }

    throw new ServiceUnavailableException("DocuSign answer wrong: incorrect file format");
  }

  async changeRecipients(envelopeId: string, recipientId: string, email: string): Promise<IChangeRecipientsInterface> {
    await this.authCheck();

    const requestData = {
      signers: [
        {
          email,
          recipientId,
        },
      ],
    };

    const response = await this.makeRequestProtected(
      `/restapi/v2/accounts/${this.accountId}/envelopes/${envelopeId}/recipients?resend_envelope=true`,
      {
        method: "PUT",
        body: JSON.stringify(requestData),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async changeCorporateRecipients(
    envelopeId: string,
    signers: IRecipientInterface[],
  ): Promise<IChangeRecipientsInterface> {
    await this.authCheck();

    const requestData = {
      signers,
    };

    const response = await this.makeRequestProtected(
      `/restapi/v2/accounts/${this.accountId}/envelopes/${envelopeId}/recipients?resend_envelope=true`,
      {
        method: "PUT",
        body: JSON.stringify(requestData),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async getTabsFromDocument(envelopeId: string, documentId: string): Promise<IDocumentTabs> {
    await this.authCheck();

    const response = await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${documentId}/tabs`,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await response.json();
  }

  async removeTabsFromDocument(envelopeId: string, documentId: string, tabs: IDocumentTabs): Promise<void> {
    await this.authCheck();

    await this.makeRequestProtected(
      `/restapi/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/${documentId}/tabs`,
      {
        method: "DELETE",
        body: JSON.stringify(tabs),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    return;
  }

  public async getEnvelopeEditLink(envelopeId: string): Promise<string> {
    await this.authCheck();

    const { appBaseUrl } = this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

    return `${appBaseUrl}/send/prepare/${envelopeId}`;
  }

  public async getEnvelopeEditDocumentLink(envelopeId: string): Promise<string> {
    await this.authCheck();

    const { appBaseUrl } = this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

    return `${appBaseUrl}/send/prepare/${envelopeId}/add-fields`;
  }

  public createTab(
    value: string,
    anchor: string,
    anchorXOffset: string,
    tabId: string,
    tabLabel: string,
  ): ICreateTabInterface {
    return {
      anchorString: anchor,
      anchorUnits: "pixels",
      anchorXOffset,
      anchorYOffset: "-5.5",
      bold: "false",
      font: "arial",
      fontSize: "size11",
      locked: "true",
      tabId,
      tabLabel,
      value,
    };
  }

  public createTitleTab(value: string): ICreateTabInterface {
    return this.createTab(value, "title:", "16", "title", "Title");
  }

  public createFirstNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "first name:", "49", "firstName", "First name");
  }

  public createMiddleNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "middle name:", "62", "middleName", "Middle name");
  }

  public createLastNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "last name:", "48", "lastName", "Last name");
  }

  public createDateOfBirthTab(value: string): ICreateTabInterface {
    return this.createTab(value, "date of birthday:", "76", "birthDate", "Birth date");
  }

  public createGenderTab(value: string): ICreateTabInterface {
    return this.createTab(value, "gender:", "35", "gender", "Gender");
  }

  public createSignerNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "CLIENT:", "39", "client", "Client");
  }

  public createCorporateMainTitleTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 1 title:", "56", "title", "Title");
  }

  public createCorporateMainFirstNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 1 first name:", "109", "firstName", "First name");
  }

  public createCorporateMainMiddleNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 1 middle name:", "112", "middleName", "Middle name");
  }

  public createCorporateMainLastNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 1 last name:", "108", "lastName", "Last name");
  }

  public createCorporateMainSignerNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "CLIENT 1:", "99", "client", "Client");
  }

  public createCorporateSecondTitleTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 2 title:", "66", "title", "Title");
  }

  public createCorporateSecondFirstNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 2 first name:", "109", "firstName", "First name");
  }

  public createCorporateSecondMiddleNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 2 middle name:", "112", "middleName", "Middle name");
  }

  public createCorporateSecondLastNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "client 2 last name:", "108", "lastName", "Last name");
  }

  public createCorporateSecondSignerNameTab(value: string): ICreateTabInterface {
    return this.createTab(value, "CLIENT 2:", "99", "client", "Client");
  }
}
