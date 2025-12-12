import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ICorporateTabData, ICreateTabInterface, IRecipientInterface } from "src/modules/docusign/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { CorporateContractSigners, DocusignContract } from "src/modules/docusign/entities";
import { Repository } from "typeorm";
import { DocusignSdkService, DocusignService } from "src/modules/docusign/services";
import {
  ECorporateSignersCount,
  EDocusignErrorCodes,
  EExtDocusignCorporateSignerStatus,
  EExtDocusignStatus,
} from "src/modules/docusign/common/enums";
import {
  FillCorporateSignersDto,
  GetCorporateSignersDto,
  RemoveSecondCorporateSignerDto,
} from "src/modules/docusign/common/dto";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { Company } from "src/modules/companies/entities";
import { CompanyActivationService } from "src/modules/account-activation/services";
import {
  DOCUSIGN_DOC_TYPE_CONTENT,
  MAIN_SIGNER_ROLE_NAME,
  SECOND_SIGNER_ROLE_NAME,
} from "src/modules/docusign/common/constants/constants";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ICreateContractOutput, ISendContractOutput } from "src/modules/docusign/common/outputs";
import { ECompanyType } from "src/modules/companies/common/enums";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";

@Injectable()
export class DocusignCorporateService {
  public constructor(
    @InjectRepository(DocusignContract)
    private readonly docusignContractRepository: Repository<DocusignContract>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CorporateContractSigners)
    private readonly corporateContractSignersRepository: Repository<CorporateContractSigners>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly docusignSdkService: DocusignSdkService,
    private readonly docusignService: DocusignService,
    private readonly companyActivationService: CompanyActivationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async fillCorporateSigners(dto: FillCorporateSignersDto, user: ITokenUserData): Promise<void> {
    let company: Company | null = null;
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);

    if (isLfhAdminOperation) {
      if (!dto.companyId) {
        throw new BadRequestException(EDocusignErrorCodes.CORPORATE_COMPANY_ID_REQUIRED);
      }

      company = await this.companyRepository.findOne({
        where: { id: dto.companyId },
        relations: { contractSigners: true, contract: true },
      });

      delete dto.companyId;
    }

    if (!isLfhAdminOperation) {
      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      company = await this.companyRepository.findOne({
        where: { id: userRole.operatedByCompanyId },
        relations: { contractSigners: true, contract: true },
      });
    }

    if (!company) {
      throw new NotFoundException(EDocusignErrorCodes.CORPORATE_COMPANY_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);

    if (!company.contractSigners) {
      const newContractSigners = this.corporateContractSignersRepository.create(dto);
      await this.corporateContractSignersRepository.save({ ...newContractSigners, company });
    }

    if (company.contractSigners) {
      await this.corporateContractSignersRepository.update({ id: company.contractSigners.id }, dto);

      if (company.contract && company.contract.docusignStatus === EExtDocusignStatus.CREATED) {
        await this.docusignContractRepository.update({ id: company.contract.id }, { signatoriesWasChanged: true });
      }
    }

    return;
  }

  public async removeSecondCorporateSigner(dto: RemoveSecondCorporateSignerDto, user: ITokenUserData): Promise<void> {
    let corporateSigners: CorporateContractSigners | null = null;
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);

    if (isLfhAdminOperation) {
      if (!dto.companyId) {
        throw new BadRequestException(EDocusignErrorCodes.CORPORATE_COMPANY_ID_REQUIRED);
      }

      corporateSigners = await this.corporateContractSignersRepository.findOne({
        select: {
          id: true,
          company: {
            id: true,
            operatedByMainCompanyId: true,
            contract: {
              id: true,
              docusignStatus: true,
            },
          },
        },
        where: { company: { id: dto.companyId } },
        relations: { company: { contract: true } },
      });
    }

    if (!isLfhAdminOperation) {
      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      corporateSigners = await this.corporateContractSignersRepository.findOne({
        select: {
          id: true,
          company: {
            id: true,
            operatedByMainCompanyId: true,
            contract: {
              id: true,
              docusignStatus: true,
            },
          },
        },
        where: { company: { id: userRole.operatedByCompanyId } },
        relations: { company: { contract: true } },
      });
    }

    if (!corporateSigners) {
      throw new NotFoundException(EDocusignErrorCodes.CORPORATE_SIGNERS_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, corporateSigners.company);

    if (
      corporateSigners.company.contract &&
      corporateSigners.company.contract.docusignStatus === EExtDocusignStatus.COMPLETED
    ) {
      throw new BadRequestException(EDocusignErrorCodes.COMMON_ALREADY_SIGNED);
    }

    await this.corporateContractSignersRepository.update(
      { id: corporateSigners.id },
      {
        secondSignerContactEmail: null,
        secondSignerTitle: null,
        secondSignerFirstName: null,
        secondSignerMiddleName: null,
        secondSignerLastName: null,
      },
    );

    if (
      corporateSigners.company.contract &&
      corporateSigners.company.contract.docusignStatus === EExtDocusignStatus.CREATED
    ) {
      await this.docusignContractRepository.update(
        { id: corporateSigners.company.contract.id },
        { signatoriesWasChanged: true },
      );
    }

    return;
  }

  public async getCorporateSigners(
    dto: GetCorporateSignersDto,
    user: ITokenUserData,
  ): Promise<CorporateContractSigners | null> {
    let corporateSigners: CorporateContractSigners | null = null;
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);

    if (isLfhAdminOperation) {
      if (!dto.companyId) {
        throw new BadRequestException(EDocusignErrorCodes.CORPORATE_COMPANY_ID_REQUIRED);
      }

      corporateSigners = await this.corporateContractSignersRepository.findOne({
        where: { company: { id: dto.companyId } },
      });
    }

    if (!isLfhAdminOperation) {
      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      corporateSigners = await this.corporateContractSignersRepository.findOne({
        where: { company: { id: userRole.operatedByCompanyId } },
      });
    }

    return corporateSigners;
  }

  public async createAndSendCorporateContract(companyId: string, user: ITokenUserData): Promise<ISendContractOutput> {
    const { contractId } = await this.createCorporateContract(companyId, user);

    return await this.fillAndSendCorporateContract(contractId);
  }

  public async createCorporateContract(companyId: string, user: ITokenUserData): Promise<ICreateContractOutput> {
    const company = await findOneOrFailTyped<Company>(companyId, this.companyRepository, {
      where: { id: companyId },
      relations: {
        contractSigners: true,
        contract: true,
        superAdmin: {
          userRoles: {
            role: true,
          },
        },
      },
    });

    if (!company.contractSigners) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_SIGNERS_NOT_SET);
    }

    if (!company.superAdmin || company.superAdmin.userRoles.length === 0) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_NO_SUPER_ADMIN_ID);
    }

    const superAdminRole = this.getSuperAdminRoleByCompanyType(company.companyType, company.superAdmin.userRoles);

    if (!superAdminRole) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_NO_SUPER_ADMIN_ROLE);
    }

    const companyActivationSteps = await this.companyActivationService.getActivationSteps(companyId, user);

    const checkContractCriteriaResult = this.companyActivationService.checkActivationCriteria(
      companyActivationSteps,
      false,
      false,
    );

    if (checkContractCriteriaResult.failed.length > 0) {
      this.companyActivationService.throwRequiredInfoException(checkContractCriteriaResult);
    }

    const companyCountry = company.country;

    const {
      mainSignerContactEmail,
      mainSignerTitle,
      mainSignerFirstName,
      mainSignerMiddleName,
      mainSignerLastName,
      secondSignerContactEmail,
      secondSignerTitle,
      secondSignerFirstName,
      secondSignerMiddleName,
      secondSignerLastName,
    } = company.contractSigners;

    let signerCount: ECorporateSignersCount = ECorporateSignersCount.ONE;

    if (secondSignerContactEmail && secondSignerTitle && secondSignerFirstName && secondSignerLastName) {
      signerCount = ECorporateSignersCount.TWO;
    }

    const templateId = this.docusignService.getTemplateId(superAdminRole.role.name, companyCountry, signerCount);

    if (!templateId) {
      throw new BadRequestException(EDocusignErrorCodes.COMMON_CONTRACT_NOT_AVAILABLE_FOR_ROLE);
    }

    const mainSignerName = `${mainSignerTitle ? " " + mainSignerTitle : ""} ${mainSignerFirstName}${mainSignerMiddleName ? " " + mainSignerMiddleName : ""} ${mainSignerLastName}`;
    let secondSignerName: string | null = null;

    if (secondSignerContactEmail && secondSignerTitle && secondSignerFirstName && secondSignerLastName) {
      secondSignerName = `${secondSignerTitle ? " " + secondSignerTitle : ""} ${secondSignerFirstName}${secondSignerMiddleName ? " " + secondSignerMiddleName : ""} ${secondSignerLastName}`;
    }

    const { envelopeId, status } = await this.docusignSdkService.createEnvelope(
      templateId,
      mainSignerContactEmail,
      mainSignerName,
      secondSignerContactEmail,
      secondSignerName,
    );

    if (company.contract) {
      await this.docusignContractRepository.delete({ id: company.contract.id });
    }

    const docusignContract = this.docusignContractRepository.create({
      docusignStatus: status,
      envelopeId,
      company,
    });

    const newDocusignContract = await this.docusignContractRepository.save(docusignContract);

    const editLink = await this.docusignSdkService.getEnvelopeEditLink(envelopeId);

    return { contractId: newDocusignContract.id, editLink };
  }

  public async fillAndSendCorporateContract(contractId: string): Promise<ISendContractOutput> {
    const docusignContract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
      relations: {
        company: {
          contractSigners: true,
          superAdmin: {
            userRoles: {
              role: true,
            },
          },
        },
      },
    });

    if (!docusignContract?.company) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_COMPANY_NOT_FOUND);
    }

    if (!docusignContract.company?.contractSigners) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_SIGNERS_NOT_SET);
    }

    const contractDocuments = await this.docusignSdkService.getDocuments(docusignContract.envelopeId);

    if (!contractDocuments?.envelopeDocuments || contractDocuments.envelopeDocuments.length === 0) {
      throw new BadRequestException(EDocusignErrorCodes.COMMON_NO_DOCUMENTS);
    }

    const signers = await this.docusignSdkService.getEnvelopeSigners(docusignContract.envelopeId);

    await this.updateSignersData(signers, docusignContract);

    await this.docusignSdkService.sendEnvelope(docusignContract.envelopeId);

    await this.docusignContractRepository.update({ id: contractId }, { signatoriesWasChanged: false });

    return { contractId: docusignContract.id };
  }

  public async resendContract(contractId: string): Promise<void> {
    const contract = await findOneOrFailTyped<DocusignContract>(contractId, this.docusignContractRepository, {
      where: { id: contractId },
      relations: {
        company: {
          superAdmin: {
            userRoles: {
              role: true,
            },
          },
          contractSigners: true,
        },
      },
    });

    if (contract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(EDocusignErrorCodes.COMMON_CONTRACT_ALREADY_COMPLETED);
    }

    if (contract.isAtLeastOneSignersSigned) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_AT_LEAST_ONE_SIGNED);
    }

    const signers = await this.docusignSdkService.getEnvelopeSigners(contract.envelopeId);

    for (const signer of signers) {
      if (signer.status === EExtDocusignCorporateSignerStatus.COMPLETED) {
        throw new BadRequestException(EDocusignErrorCodes.CORPORATE_AT_LEAST_ONE_SIGNED);
      }
    }

    await this.updateSignersData(signers, contract);

    return;
  }

  public async getEditLink(contractId: string): Promise<ICreateContractOutput> {
    const contract = await findOneOrFailTyped<DocusignContract>(contractId, this.docusignContractRepository, {
      where: { id: contractId },
    });

    if (contract.docusignStatus !== EExtDocusignStatus.CREATED) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_CONTRACT_NOT_EDITABLE);
    }

    const editLink = await this.docusignSdkService.getEnvelopeEditLink(contract.envelopeId);

    return { contractId: contract.id, editLink };
  }

  private async updateSignersData(signers: IRecipientInterface[], contract: DocusignContract): Promise<void> {
    if (!contract.company) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_COMPANY_NOT_FOUND);
    }

    if (!contract.company?.contractSigners) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_SIGNERS_NOT_FILLED);
    }

    if (!contract.company.superAdmin || contract.company.superAdmin.userRoles.length === 0) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_NO_SUPER_ADMIN_ID);
    }

    const superAdminRole = this.getSuperAdminRoleByCompanyType(
      contract.company.companyType,
      contract.company.superAdmin.userRoles,
    );

    if (!superAdminRole) {
      throw new BadRequestException(EDocusignErrorCodes.CORPORATE_NO_SUPER_ADMIN_ROLE);
    }

    const mainSignerIndex = signers.findIndex((signer) => signer.roleName === MAIN_SIGNER_ROLE_NAME);
    const secondSignerIndex = signers.findIndex((signer) => signer.roleName === SECOND_SIGNER_ROLE_NAME);

    const {
      mainSignerContactEmail,
      mainSignerTitle,
      mainSignerFirstName,
      mainSignerMiddleName,
      mainSignerLastName,
      secondSignerContactEmail,
      secondSignerTitle,
      secondSignerFirstName,
      secondSignerMiddleName,
      secondSignerLastName,
    } = contract.company.contractSigners;

    const companyCountry = contract.company.country;

    let signerCount: ECorporateSignersCount = ECorporateSignersCount.ONE;

    if (secondSignerContactEmail && secondSignerTitle && secondSignerFirstName && secondSignerLastName) {
      signerCount = ECorporateSignersCount.TWO;
    }

    signers[mainSignerIndex].name =
      `${mainSignerTitle ? " " + mainSignerTitle : ""} ${mainSignerFirstName}${mainSignerMiddleName ? " " + mainSignerMiddleName : ""} ${mainSignerLastName}`;
    signers[mainSignerIndex].email = mainSignerContactEmail;

    const envelopeDocs = await this.docusignSdkService.getDocuments(contract.envelopeId);

    const documentIndex = envelopeDocs.envelopeDocuments.findIndex(
      (document) => document.type === DOCUSIGN_DOC_TYPE_CONTENT,
    );

    const tabs = await this.docusignSdkService.getTabsFromDocument(
      contract.envelopeId,
      envelopeDocs.envelopeDocuments[documentIndex].documentId,
    );

    if (tabs.textTabs) {
      await this.docusignSdkService.removeTabsFromDocument(
        contract.envelopeId,
        envelopeDocs.envelopeDocuments[documentIndex].documentId,
        { textTabs: tabs.textTabs },
      );
    }

    const mainTabs = this.getCorporateTabs(
      superAdminRole.role.name,
      companyCountry,
      {
        title: mainSignerTitle,
        firstName: mainSignerFirstName,
        middleName: mainSignerMiddleName,
        lastName: mainSignerLastName,
      },
      true,
      signerCount,
    );

    await this.docusignSdkService.addTabsToEnvelope(
      contract.envelopeId,
      signers[mainSignerIndex].recipientId,
      mainTabs,
    );

    if (
      secondSignerIndex >= 0 &&
      secondSignerContactEmail &&
      secondSignerTitle &&
      secondSignerFirstName &&
      secondSignerLastName
    ) {
      signers[secondSignerIndex].name =
        `${secondSignerTitle ? " " + secondSignerTitle : ""} ${secondSignerFirstName}${secondSignerMiddleName ? " " + secondSignerMiddleName : ""} ${secondSignerLastName}`;
      signers[secondSignerIndex].email = secondSignerContactEmail;

      const secondTabs = this.getCorporateTabs(
        contract.company.superAdmin.userRoles[0].role.name,
        companyCountry,
        {
          title: secondSignerTitle,
          firstName: secondSignerFirstName,
          middleName: secondSignerMiddleName,
          lastName: secondSignerLastName,
        },
        false,
        signerCount,
      );

      await this.docusignSdkService.addTabsToEnvelope(
        contract.envelopeId,
        signers[secondSignerIndex].recipientId,
        secondTabs,
      );
    }

    await this.docusignSdkService.changeCorporateRecipients(contract.envelopeId, signers);

    return;
  }

  private getCorporateTabs(
    userRoleName: EUserRoleName,
    userCountry: string,
    corporateSigner: ICorporateTabData,
    isMain: boolean,
    corporateClientCount: ECorporateSignersCount,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      tabs = this.getCorporateClientsSuperAdminAustraliaTabs(corporateSigner, isMain, corporateClientCount);
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      tabs = this.getCorporateClientsSuperAdminOtherCountryTabs(corporateSigner, isMain, corporateClientCount);
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      tabs = this.getCorporateInterpretingProvidersSuperAdminAustraliaTabs(
        corporateSigner,
        isMain,
        corporateClientCount,
      );
    }

    if (
      userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      !AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userCountry as EExtCountry)
    ) {
      tabs = this.getCorporateInterpretingProvidersSuperAdminOtherCountryTabs(
        corporateSigner,
        isMain,
        corporateClientCount,
      );
    }

    return tabs;
  }

  private getCorporateClientsSuperAdminAustraliaTabs(
    corporateSigner: ICorporateTabData,
    isMain: boolean,
    corporateClientCount: ECorporateSignersCount,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    const { title, firstName, middleName, lastName } = corporateSigner;
    const signerName = `${title ? " " + title : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (corporateClientCount === ECorporateSignersCount.ONE) {
      tabs = [
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];

      if (title) {
        tabs.push(this.docusignSdkService.createTitleTab(title));
      }

      if (middleName) {
        tabs.push(this.docusignSdkService.createMiddleNameTab(middleName));
      }
    }

    if (corporateClientCount === ECorporateSignersCount.TWO) {
      if (isMain) {
        tabs = [
          this.docusignSdkService.createCorporateMainFirstNameTab(firstName),
          this.docusignSdkService.createCorporateMainLastNameTab(lastName),
          this.docusignSdkService.createCorporateMainSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateMainTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateMainMiddleNameTab(middleName));
        }
      }

      if (!isMain) {
        tabs = [
          this.docusignSdkService.createCorporateSecondFirstNameTab(firstName),
          this.docusignSdkService.createCorporateSecondLastNameTab(lastName),
          this.docusignSdkService.createCorporateSecondSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateSecondTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateSecondMiddleNameTab(middleName));
        }
      }
    }

    return tabs;
  }

  private getCorporateClientsSuperAdminOtherCountryTabs(
    corporateSigner: ICorporateTabData,
    isMain: boolean,
    corporateClientCount: ECorporateSignersCount,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    const { title, firstName, middleName, lastName } = corporateSigner;
    const signerName = `${title ? " " + title : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (corporateClientCount === ECorporateSignersCount.ONE) {
      tabs = [
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];

      if (title) {
        tabs.push(this.docusignSdkService.createTitleTab(title));
      }

      if (middleName) {
        tabs.push(this.docusignSdkService.createMiddleNameTab(middleName));
      }
    }

    if (corporateClientCount === ECorporateSignersCount.TWO) {
      if (isMain) {
        tabs = [
          this.docusignSdkService.createCorporateMainFirstNameTab(firstName),
          this.docusignSdkService.createCorporateMainLastNameTab(lastName),
          this.docusignSdkService.createCorporateMainSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateMainTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateMainMiddleNameTab(middleName));
        }
      }

      if (!isMain) {
        tabs = [
          this.docusignSdkService.createCorporateSecondFirstNameTab(firstName),
          this.docusignSdkService.createCorporateSecondLastNameTab(lastName),
          this.docusignSdkService.createCorporateSecondSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateSecondTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateSecondMiddleNameTab(middleName));
        }
      }
    }

    return tabs;
  }

  private getCorporateInterpretingProvidersSuperAdminAustraliaTabs(
    corporateSigner: ICorporateTabData,
    isMain: boolean,
    corporateClientCount: ECorporateSignersCount,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    const { title, firstName, middleName, lastName } = corporateSigner;
    const signerName = `${title ? " " + title : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (corporateClientCount === ECorporateSignersCount.ONE) {
      tabs = [
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];

      if (title) {
        tabs.push(this.docusignSdkService.createTitleTab(title));
      }

      if (middleName) {
        tabs.push(this.docusignSdkService.createMiddleNameTab(middleName));
      }
    }

    if (corporateClientCount === ECorporateSignersCount.TWO) {
      if (isMain) {
        tabs = [
          this.docusignSdkService.createCorporateMainFirstNameTab(firstName),
          this.docusignSdkService.createCorporateMainLastNameTab(lastName),
          this.docusignSdkService.createCorporateMainSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateMainTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateMainMiddleNameTab(middleName));
        }
      }

      if (!isMain) {
        tabs = [
          this.docusignSdkService.createCorporateSecondFirstNameTab(firstName),
          this.docusignSdkService.createCorporateSecondLastNameTab(lastName),
          this.docusignSdkService.createCorporateSecondSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateSecondTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateSecondMiddleNameTab(middleName));
        }
      }
    }

    return tabs;
  }

  private getCorporateInterpretingProvidersSuperAdminOtherCountryTabs(
    corporateSigner: ICorporateTabData,
    isMain: boolean,
    corporateClientCount: ECorporateSignersCount,
  ): ICreateTabInterface[] {
    let tabs: ICreateTabInterface[] = [];

    const { title, firstName, middleName, lastName } = corporateSigner;
    const signerName = `${title ? " " + title : ""} ${firstName}${middleName ? " " + middleName : ""} ${lastName}`;

    if (corporateClientCount === ECorporateSignersCount.ONE) {
      tabs = [
        this.docusignSdkService.createFirstNameTab(firstName),
        this.docusignSdkService.createLastNameTab(lastName),
        this.docusignSdkService.createSignerNameTab(signerName),
      ];

      if (title) {
        tabs.push(this.docusignSdkService.createTitleTab(title));
      }

      if (middleName) {
        tabs.push(this.docusignSdkService.createMiddleNameTab(middleName));
      }
    }

    if (corporateClientCount === ECorporateSignersCount.TWO) {
      if (isMain) {
        tabs = [
          this.docusignSdkService.createCorporateMainFirstNameTab(firstName),
          this.docusignSdkService.createCorporateMainLastNameTab(lastName),
          this.docusignSdkService.createCorporateMainSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateMainTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateMainMiddleNameTab(middleName));
        }
      }

      if (!isMain) {
        tabs = [
          this.docusignSdkService.createCorporateSecondFirstNameTab(firstName),
          this.docusignSdkService.createCorporateSecondLastNameTab(lastName),
          this.docusignSdkService.createCorporateSecondSignerNameTab(signerName),
        ];

        if (title) {
          tabs.push(this.docusignSdkService.createCorporateSecondTitleTab(title));
        }

        if (middleName) {
          tabs.push(this.docusignSdkService.createCorporateSecondMiddleNameTab(middleName));
        }
      }
    }

    return tabs;
  }

  private getSuperAdminRoleByCompanyType(companyType: ECompanyType, superAdminRoles: UserRole[]): UserRole | undefined {
    let searchedRoleName: EUserRoleName | null = null;

    if (companyType === ECompanyType.CORPORATE_CLIENTS) {
      searchedRoleName = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    } else if (companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      searchedRoleName = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    }

    const superAdminRole = superAdminRoles.find((userRole) => userRole.role.name === searchedRoleName);

    return superAdminRole;
  }
}
