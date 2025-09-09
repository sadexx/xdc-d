import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ICreateTabInterface, IDocusignApiDataInterface } from "src/modules/docusign/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { DocusignContract } from "src/modules/docusign/entities";
import { FindOptionsWhere, Repository } from "typeorm";
import { AccountActivationService } from "src/modules/account-activation/services";
import { DocusignQueryOptionsService, DocusignSdkService } from "src/modules/docusign/services";
import { ECorporateSignersCount, EExtDocusignStatus } from "src/modules/docusign/common/enums";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { DownloadContractDto, GetContractsDto, SendContractDto } from "src/modules/docusign/common/dto";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { IStepInformation } from "src/modules/account-activation/common/interfaces";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  ICreateContractOutput,
  IDownloadContractOutput,
  IGetLinkToDocumentOutput,
  ISendContractOutput,
} from "src/modules/docusign/common/outputs";
import {
  TCreateContractUserRole,
  TFillAndSendContractUserRole,
  TResendContractUserRole,
} from "src/modules/docusign/common/types";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";

@Injectable()
export class DocusignService {
  public constructor(
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
    private readonly accountActivationService: AccountActivationService,
    private readonly docusignSdkService: DocusignSdkService,
    private readonly awsS3Service: AwsS3Service,
    private readonly docusignQueryService: DocusignQueryOptionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createAndSendContract(user: ITokenUserData): Promise<ISendContractOutput> {
    const { contractId } = await this.createContract(user);

    return await this.fillAndSendContract(contractId, user);
  }

  public async createContract(user: ITokenUserData): Promise<ICreateContractOutput> {
    const queryOptions = this.docusignQueryService.getCreateContractUserRoleOptions(user);
    const userRole = await findOneOrFailTyped<TCreateContractUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    if (userRole.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    const userCountry = userRole.address?.country;

    if (!userCountry) {
      throw new BadRequestException("User country is not defined!");
    }

    const neededSteps = await this.accountActivationService.retrieveRequiredAndActivationSteps(user);

    if (!neededSteps?.docusignContractFulfilled) {
      throw new BadRequestException("Contract is not available for this role!");
    }

    if (neededSteps?.docusignContractFulfilled?.status === EStepStatus.SUCCESS) {
      throw new BadRequestException("Contract already signed!");
    }

    delete neededSteps.docusignContractFulfilled;

    Object.keys(neededSteps).forEach((stepName) => {
      const step = (neededSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (step.isBlockAccountActivation) {
        if (step.status !== EStepStatus.SUCCESS) {
          throw new BadRequestException("Not all steps are completed!");
        }
      }
    });

    const templateId = this.getTemplateId(user.role, userCountry);

    if (!templateId) {
      throw new BadRequestException("Contract is not available for this role!");
    }

    const { title, firstName, middleName, lastName, contactEmail } = userRole.profile;
    const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (!contactEmail) {
      throw new UnprocessableEntityException("Contact email is not specified!");
    }

    const { envelopeId, status } = await this.docusignSdkService.createEnvelope(templateId, contactEmail, signerName);

    const docusignContract = this.docusignContractRepository.create({
      userRole,
      docusignStatus: status,
      envelopeId,
    });

    const newDocusignContract = await this.docusignContractRepository.save(docusignContract);

    const editLink = await this.docusignSdkService.getEnvelopeEditLink(envelopeId);

    return { contractId: newDocusignContract.id, editLink };
  }

  public async fillAndSendContract(contractId: string, user: ITokenUserData): Promise<ISendContractOutput> {
    const { id: userId, role: userRoleName } = user;

    if (!userId) {
      throw new BadRequestException("User not found");
    }

    const docusignContract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
      relations: {
        userRole: {
          role: true,
        },
      },
    });

    if (!docusignContract) {
      throw new NotFoundException(`Contract with this id not found!`);
    }

    if (docusignContract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract already completed!`);
    }

    const contractDocuments = await this.docusignSdkService.getDocuments(docusignContract.envelopeId);

    if (!contractDocuments?.envelopeDocuments || contractDocuments.envelopeDocuments.length === 0) {
      throw new BadRequestException("Envelope not contained document!");
    }

    const queryOptions = this.docusignQueryService.getFillAndSendContractUserRoleQueryOptions(user);
    const userRole = await findOneOrFailTyped<TFillAndSendContractUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    const userCountry = userRole.address?.country;

    if (!userCountry) {
      throw new BadRequestException("User country is not defined!");
    }

    if (!userRole.profile) {
      throw new BadRequestException("User profile is not defined!");
    }

    const tabs: ICreateTabInterface[] = this.getPersonalTabs(userRoleName, userCountry, userRole.profile);

    const recipientId = await this.docusignSdkService.getEnvelopeRecipient(docusignContract.envelopeId);

    await this.docusignSdkService.addTabsToEnvelope(docusignContract.envelopeId, recipientId, tabs);

    await this.docusignSdkService.sendEnvelope(docusignContract.envelopeId);

    return { contractId: docusignContract.id };
  }

  public async callback(): Promise<string> {
    await this.docusignSdkService.auth();

    return "Access successfully granted, you can continue using app";
  }

  public async downloadContract(dto: DownloadContractDto, user: ITokenUserData): Promise<IDownloadContractOutput> {
    const contract = await this.docusignContractRepository.findOne({
      select: {
        id: true,
        s3ContractKey: true,
        docusignStatus: true,
        userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
        company: { id: true, operatedByMainCompanyId: true },
      },
      where: { id: dto.id },
      relations: { userRole: true, company: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.userRole) {
      await this.accessControlService.authorizeUserRoleForOperation(user, contract.userRole);
    }

    if (contract.company) {
      await this.accessControlService.authorizeUserRoleForCompanyOperation(user, contract.company);
    }

    if (contract.docusignStatus !== EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract with this id not completed!`);
    }

    if (!contract.s3ContractKey) {
      throw new UnprocessableEntityException(`File of this contract saved with error!`);
    }

    const fileLink = await this.awsS3Service.getShortLivedSignedUrl(contract.s3ContractKey);

    return { link: fileLink };
  }

  public async resendContract(dto: SendContractDto): Promise<void> {
    const contract = await this.docusignContractRepository.findOne({
      select: {
        id: true,
        envelopeId: true,
        docusignStatus: true,
        userRole: { id: true },
      },
      where: { id: dto.id },
      relations: { userRole: true },
    });

    if (!contract || !contract.userRole) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract with this id already completed!`);
    }

    const recipientId = await this.docusignSdkService.getEnvelopeRecipient(contract.envelopeId);

    const queryOptions = this.docusignQueryService.getResendContractUserRoleQueryOptions(contract.userRole);
    const userRole = await findOneOrFailTyped<TResendContractUserRole>(
      contract.userRole.id,
      this.userRoleRepository,
      queryOptions,
    );

    await this.docusignSdkService.changeRecipients(contract.envelopeId, recipientId, userRole.profile.contactEmail);

    return;
  }

  public async getContractList(dto: GetContractsDto, user: ITokenUserData): Promise<DocusignContract[]> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation({ userRoleId: dto.userId }, user);
    const whereCondition: FindOptionsWhere<DocusignContract> = isAdminOperation
      ? { userRole: { userId: dto.userId } }
      : { userRole: { id: user.userRoleId } };

    return await this.docusignContractRepository.find({
      select: {
        id: true,
        docusignStatus: true,
        sendDate: true,
        signDate: true,
      },
      where: whereCondition,
      take: dto.limit,
      skip: dto.offset,
      order: {
        sendDate: dto.sortOrder,
      },
    });
  }

  public async getLinkToDocument(contractId: string): Promise<IGetLinkToDocumentOutput> {
    const docusignContract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
      relations: {
        userRole: {
          role: true,
        },
      },
    });

    if (!docusignContract) {
      throw new NotFoundException(`Contract with this id not found!`);
    }

    const documentLink = await this.docusignSdkService.getEnvelopeEditDocumentLink(docusignContract.envelopeId);

    return { documentLink };
  }

  private getPersonalTabs(
    userRoleName: EUserRoleName,
    userCountry: string,
    userProfile: TFillAndSendContractUserRole["profile"],
  ): ICreateTabInterface[] {
    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      return this.createStandardPersonalTabs(userProfile);
    }

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      return this.createStandardPersonalTabs(userProfile);
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      return this.createStandardPersonalTabs(userProfile);
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      return this.createStandardPersonalTabs(userProfile);
    }

    return [];
  }

  private createStandardPersonalTabs(userProfile: TFillAndSendContractUserRole["profile"]): ICreateTabInterface[] {
    const { title, firstName, middleName, lastName, dateOfBirth, gender } = userProfile;
    const signerName = `${title ? title + " " : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    const tabs: ICreateTabInterface[] = [];

    if (title) {
      tabs.push(this.docusignSdkService.createTitleTab(title));
    }

    tabs.push(this.docusignSdkService.createFirstNameTab(firstName));

    if (middleName) {
      tabs.push(this.docusignSdkService.createMiddleNameTab(middleName));
    }

    tabs.push(this.docusignSdkService.createLastNameTab(lastName));
    tabs.push(this.docusignSdkService.createDateOfBirthTab(dateOfBirth));
    tabs.push(this.docusignSdkService.createGenderTab(gender));
    tabs.push(this.docusignSdkService.createSignerNameTab(signerName));

    return tabs;
  }

  public getTemplateId(
    userRoleName: EUserRoleName,
    userCountry: string,
    corporateClientCount?: ECorporateSignersCount,
  ): string | null {
    const {
      indProfessionalInterpreterAustraliaTemplateId,
      indProfessionalInterpreterDifferentCountryTemplateId,
      indLanguageBuddyAustraliaTemplateId,
      indLanguageBuddyDifferentCountryTemplateId,
      corporateClientsSuperAdminAustraliaTemplateId,
      corporateClientsSuperAdminDifferentCountryTemplateId,
      corporateInterpretingProvidersSuperAdminAustraliaTemplateId,
      corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId,
      corporateClientsSuperAdminAustraliaSingleTemplateId,
      corporateClientsSuperAdminDifferentCountrySingleTemplateId,
      corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId,
      corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId,
    } = this.configService.getOrThrow<IDocusignApiDataInterface>("docusign");

    let templateId: string | null = null;

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indProfessionalInterpreterAustraliaTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indProfessionalInterpreterDifferentCountryTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indLanguageBuddyAustraliaTemplateId;
    }

    if (
      userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      templateId = indLanguageBuddyDifferentCountryTemplateId;
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateClientsSuperAdminAustraliaSingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateClientsSuperAdminAustraliaTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateClientsSuperAdminDifferentCountrySingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateClientsSuperAdminDifferentCountryTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateInterpretingProvidersSuperAdminAustraliaTemplateId;
      }
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      if (corporateClientCount === ECorporateSignersCount.ONE) {
        templateId = corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId;
      }

      if (corporateClientCount === ECorporateSignersCount.TWO) {
        templateId = corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId;
      }
    }

    return templateId;
  }
}
