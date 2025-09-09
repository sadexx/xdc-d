import { BadRequestException, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { RedisService } from "src/modules/redis/services";
import { ConfigService } from "@nestjs/config";
import { IAbnMessageWithReview } from "src/modules/abn/common/interface";
import { EExtAbnStatus, EExtAbnTypeCode } from "src/modules/abn/common/enums";
import { randomUUID } from "node:crypto";
import { IResultVerification } from "src/modules/ielts/common/interfaces";
import { BackyCheck } from "src/modules/backy-check/entities";
import { EExtCheckResult, EExtCheckStatus } from "src/modules/backy-check/common/enums";
import { EExtInterpreterLevel, EExtNaatiLanguages } from "src/modules/naati/common/enum";
import { EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { DocusignContract } from "src/modules/docusign/entities";
import { IPhoneVerification } from "src/modules/users/common/interfaces";
import { INaatiApiResponseOutput } from "src/modules/naati/common/outputs";
import { UserRole } from "src/modules/users/entities";
import { TokensService } from "src/modules/tokens/services";
import { TMockParams, TMockResult, TMockTypeResultMap } from "src/modules/mock/common/types";
import { EMockType } from "src/modules/mock/common/enums";
import {
  IMockCreateAndSendContract,
  IMockData,
  IMockGetAbnVerificationStatus,
  IMockIeltsVerification,
  IMockRegistration,
  IMockSendPhoneNumberVerificationCode,
  IMockStartWWCC,
  IMockVerificationNaatiCpnNumber,
  IMockVerifyCode,
} from "src/modules/mock/common/interfaces";
import {
  IMockAnswerResult,
  IMockGetAbnVerificationStatusResult,
  IMockIeltsVerificationResult,
  IMockPhoneNumberSendResult,
  IMockRegistrationResult,
  IMockStartWWCCResult,
  IMockVerificationNaatiCpnNumberResult,
} from "src/modules/mock/common/outputs";

@Injectable()
export class MockService {
  public readonly mockEmails: string[];
  private readonly mockPhones: string[];
  public readonly mockAbnNumber: string;
  public readonly mockIeltsNumber: string;
  public readonly mockWWCCNumber: string;
  public readonly mockNaatiNumber: string;
  public readonly mockSumSubFullName: string;

  public constructor(
    @InjectRepository(BackyCheck)
    private readonly backyCheckRepository: Repository<BackyCheck>,
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly tokensService: TokensService,
  ) {
    const { emails, phones, abnNumber, ieltsNumber, wwccNumber, naatiNumber, sumSubFullName } =
      this.configService.getOrThrow<IMockData>("mock");

    this.mockEmails = emails;
    this.mockPhones = phones;
    this.mockAbnNumber = abnNumber;
    this.mockIeltsNumber = ieltsNumber;
    this.mockWWCCNumber = wwccNumber;
    this.mockNaatiNumber = naatiNumber;
    this.mockSumSubFullName = sumSubFullName;
  }

  public async processMock<T extends TMockParams>(params: T): Promise<TMockTypeResultMap[T["type"]]> {
    let result: TMockResult;
    switch (params.type) {
      case EMockType.REGISTRATION:
        result = await this.mockRegistration(params.data);
        break;
      case EMockType.EMAIL_VERIFY_CODE:
        result = this.mockEmailVerifyCode(params.data);
        break;
      case EMockType.SEND_PHONE_NUMBER_VERIFICATION_CODE:
        result = await this.mockSendPhoneNumberVerificationCode(params.data);
        break;
      case EMockType.GET_ABN_VERIFICATION_STATUS:
        result = this.mockGetAbnVerificationStatus(params.data);
        break;
      case EMockType.IELTS_VERIFICATION:
        result = this.mockIeltsVerification(params.data);
        break;
      case EMockType.START_WWCC:
        result = await this.mockStartWWCC(params.data);
        break;
      case EMockType.VERIFICATION_NAATI_CPN_NUMBER:
        result = this.mockVerificationNaatiCpnNumber(params.data);
        break;
      case EMockType.CREATE_AND_SEND_CONTRACT:
        result = await this.mockCreateAndSendContract(params.data);
        break;
      default:
        throw new BadRequestException(`Unsupported mock type.`);
    }

    return result as TMockTypeResultMap[T["type"]];
  }

  private async mockRegistration(data: IMockRegistration): Promise<IMockRegistrationResult> {
    const { dto, currentClient } = data;

    if (!this.mockEmails.includes(dto.email)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    const emailConfirmationToken = await this.tokensService.createEmailConfirmationToken({
      email: dto.email,
      userRole: dto.role,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });

    return {
      isMocked: true,
      result: {
        emailConfirmationToken,
      },
    };
  }

  private mockEmailVerifyCode(data: IMockVerifyCode): IMockAnswerResult {
    const { email } = data;

    if (!this.mockEmails.includes(email)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    return {
      isMocked: true,
      result: null,
    };
  }

  private async mockSendPhoneNumberVerificationCode(
    data: IMockSendPhoneNumberVerificationCode,
  ): Promise<IMockPhoneNumberSendResult> {
    const { phoneNumber, cacheKey } = data;

    if (!this.mockPhones.includes(phoneNumber)) {
      return {
        isMocked: false,
        result: null,
      };
    }

    await this.redisService.setJson<IPhoneVerification>(cacheKey, {
      phoneNumber,
      confirmationCode: "000000",
    });

    return {
      isMocked: true,
      result: { message: "Phone verification code is send" },
    };
  }

  private mockGetAbnVerificationStatus(data: IMockGetAbnVerificationStatus): IMockGetAbnVerificationStatusResult {
    const { userName } = data;

    const IAbnMessageWithReview: IAbnMessageWithReview = {
      abnNumber: randomUUID(),
      abnStatus: EExtAbnStatus.ACTIVE,
      abnStatusEffectiveFrom: "2015-09-08",
      acn: "",
      addressDate: "2015-09-08",
      addressPostcode: "2130",
      addressState: "NSW",
      businessName: [],
      fullName: userName,
      typeCode: EExtAbnTypeCode.IND,
      typeName: "Individual/Sole Trader",
      gst: null,
      message: "",
    };

    return {
      isMocked: false,
      result: IAbnMessageWithReview,
    };
  }

  private mockIeltsVerification(data: IMockIeltsVerification): IMockIeltsVerificationResult {
    const { firstName, lastName } = data;

    const resultVerification: IResultVerification = {
      messageMetadata: {
        messageRequestUid: "uqapiap801-4777-492020-1",
        messageOriginator: "SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM",
        messageRequestDateTime: "2020-11-09T14:10:08.609Z",
        previousResultSetUrl: "",
        currentResultSetUrl:
          "https://apis-sandbox.cambridgeassessment.org.uk/qa2/v1/ielts/result-verification?endDateTime=2019-09-16T23:28:00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageOriginator=SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM&messageRequestUId=uqapiap801-4777-492020-1&apiUrl=https://null/v1/ielts/result-verification?startDateTime=2019-07-20T23%3A28%3A00&endDateTime=2019-09-16T23%3A28%3A00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageRequestDateTime=2020-11-09T14:10:07.663",
        nextResultSetUrl:
          "https://apis-sandbox.cambridgeassessment.org.uk/qa2/v1/ielts/result-verification?endDateTime=2019-09-16T23:28:00&trfNumber=null&photoFlag=Y&page=2&limit=2500&messageOriginator=SBdSoCILzw7OP1cyPxPIXchkmGOCEpRM&messageRequestUId=uqapiap801-4777-492020-1&apiUrl=https://null/v1/ielts/result-verification?startDateTime=2019-07-20T23%3A28%3A00&endDateTime=2019-09-16T23%3A28%3A00&trfNumber=null&photoFlag=Y&page=1&limit=2500&messageRequestDateTime=2020-11-09T14:10:07.663",
        QueryResultSet: [],
      },
      results: [
        {
          roName: "PT517",
          roId: "103428",
          candidateId: "ZID4787605390",
          idType: "I",
          centreNumber: "SIT02",
          candidateNumber: "020279",
          testDate: "20190702",
          module: "Academic",
          familyName: lastName.toUpperCase(),
          firstName: firstName.toUpperCase(),
          dateOfBirth: "20030414",
          gender: "M",
          listeningScore: "9.00",
          readingScore: "9.00",
          writingScore: "9.00",
          speakingScore: "9.00",
          overallBandScore: "9.00",
          trfNumber: randomUUID(),
          telephone: "24471823489",
          postalAddress: "Gate Farm Road Cottage View District X37 Building 50",
          addressLine1: "Gate Farm Road",
          addressLine2: "Cottage View",
          addressLine3: "District X37",
          addressLine4: "Building 50",
          region: "AF",
          town: "Shiraz",
          postCode: "KU8PK",
          country: "Marshall Islands",
          countryCode: "MHL",
          candidateEmail: "Edmundo.Robertello@example.com",
          photo: {
            data: "Test",
          },
          photoMediaType: "JPEG",
          status: "RELEASED",
          lastModifiedDate: "2019-08-10T09:08:57",
        },
      ],
      resultSummary: {
        recordCount: 1,
      },
    };

    return {
      isMocked: false,
      result: resultVerification,
    };
  }

  private async mockStartWWCC(data: IMockStartWWCC): Promise<IMockStartWWCCResult> {
    const { requestId } = data;

    await this.backyCheckRepository.update(
      { id: requestId },
      {
        WWCCNumber: randomUUID(),
        orderId: randomUUID(),
        checkStatus: EExtCheckStatus.READY,
        checkResults: EExtCheckResult.CLEAR,
      },
    );

    return {
      isMocked: true,
      result: { id: requestId },
    };
  }

  private mockVerificationNaatiCpnNumber(data: IMockVerificationNaatiCpnNumber): IMockVerificationNaatiCpnNumberResult {
    const { firstName, lastName } = data;

    const resultVerification: INaatiApiResponseOutput = {
      errorCode: 0,
      practitioner: {
        practitionerId: randomUUID(),
        givenName: firstName,
        familyName: lastName,
        country: "Australia",
      },
      currentCertifications: [],
      previousCertifications: [
        {
          certificationType: EExtInterpreterLevel.CERTIFIED_INTERPRETER,
          skill: "Russian and English",
          language1: EExtNaatiLanguages.RUSSIAN,
          language2: EExtNaatiLanguages.ENGLISH,
          direction: "[Language 1] and [Language 2]",
          startDate: "04/04/2018",
          endDate: "01/05/2021",
        },
        {
          certificationType: EExtInterpreterLevel.CERTIFIED_CONFERENCE_INTERPRETER,
          skill: "English into Russian",
          language1: EExtNaatiLanguages.RUSSIAN,
          language2: EExtNaatiLanguages.ENGLISH,
          direction: "[Language 2] into [Language 1]",
          startDate: "04/04/2018",
          endDate: "01/05/2021",
        },
      ],
    };

    return {
      isMocked: true,
      result: resultVerification,
    };
  }

  private async mockCreateAndSendContract(data: IMockCreateAndSendContract): Promise<IMockAnswerResult> {
    const { user } = data;

    const userRole = await this.userRoleRepository.findOneOrFail({
      select: { id: true },
      where: { id: user.userRoleId },
    });

    const docusignContract = this.docusignContractRepository.create({
      userRole,
      docusignStatus: EExtDocusignStatus.COMPLETED,
      envelopeId: randomUUID(),
      sendDate: new Date(),
      signDate: new Date(),
      s3ContractKey: "users/contracts/mocked-contract.pdf",
    });

    await this.docusignContractRepository.save(docusignContract);

    return {
      isMocked: true,
      result: null,
    };
  }
}
