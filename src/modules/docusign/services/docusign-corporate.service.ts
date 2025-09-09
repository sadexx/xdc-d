import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ICorporateTabData, ICreateTabInterface, IRecipientInterface } from "src/modules/docusign/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { CorporateContractSigners, DocusignContract } from "src/modules/docusign/entities";
import { Repository } from "typeorm";
import { DocusignSdkService, DocusignService } from "src/modules/docusign/services";
import {
  ECorporateSignersCount,
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
        throw new BadRequestException("Please, set company id!");
      }

      company = await this.companyRepository.findOne({
        where: { id: dto.companyId },
        relations: { contractSigners: true, contract: true },
      });

      delete dto.companyId;
    }

    if (!isLfhAdminOperation) {
      const userRole = await this.userRoleRepository.findOne({
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      if (!userRole) {
        throw new BadRequestException("User role not exists!");
      }

      company = await this.companyRepository.findOne({
        where: { id: userRole.operatedByCompanyId },
        relations: { contractSigners: true, contract: true },
      });
    }

    if (!company) {
      throw new NotFoundException("Company not found!");
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
        throw new BadRequestException("Please, set company id!");
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
      const userRole = await this.userRoleRepository.findOne({
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      if (!userRole) {
        throw new BadRequestException("User role not exists!");
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
        where: { company: { id: userRole.operatedByCompanyId } },
        relations: { company: { contract: true } },
      });
    }

    if (!corporateSigners) {
      throw new NotFoundException("Corporate signers not found!");
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, corporateSigners.company);

    if (
      corporateSigners.company.contract &&
      corporateSigners.company.contract.docusignStatus === EExtDocusignStatus.COMPLETED
    ) {
      throw new BadRequestException("Contract already signed!");
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
        throw new BadRequestException("Please, set company id!");
      }

      corporateSigners = await this.corporateContractSignersRepository.findOne({
        where: { company: { id: dto.companyId } },
      });
    }

    if (!isLfhAdminOperation) {
      const userRole = await this.userRoleRepository.findOne({
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      if (!userRole) {
        throw new BadRequestException("User role not exists!");
      }

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
    const company = await this.companyRepository.findOne({
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

    if (!company) {
      throw new BadRequestException("Company for this user not exist!");
    }

    if (!company.contractSigners) {
      throw new BadRequestException("Set contract signers!");
    }

    if (!company.superAdmin || company.superAdmin.userRoles.length === 0) {
      throw new BadRequestException(`Company ${company.id} does not have superAdminId`);
    }

    const superAdminRole = this.getSuperAdminRoleByCompanyType(company.companyType, company.superAdmin.userRoles);

    if (!superAdminRole) {
      throw new BadRequestException(`Company ${company.id} does not have superAdmin role`);
    }

    const companyActivationSteps = await this.companyActivationService.getActivationSteps(companyId, user);

    const checkContractCriteriaResult = this.companyActivationService.checkActivationCriteria(
      companyActivationSteps,
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
      throw new BadRequestException("Contract is not available for this role!");
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
      throw new BadRequestException("Company for this user not exist!");
    }

    if (!docusignContract.company?.contractSigners) {
      throw new BadRequestException("Set contract signers!");
    }

    const contractDocuments = await this.docusignSdkService.getDocuments(docusignContract.envelopeId);

    if (!contractDocuments?.envelopeDocuments || contractDocuments.envelopeDocuments.length === 0) {
      throw new BadRequestException("Envelope not contained document!");
    }

    const signers = await this.docusignSdkService.getEnvelopeSigners(docusignContract.envelopeId);

    await this.updateSignersData(signers, docusignContract);

    await this.docusignSdkService.sendEnvelope(docusignContract.envelopeId);

    await this.docusignContractRepository.update({ id: contractId }, { signatoriesWasChanged: false });

    return { contractId: docusignContract.id };
  }

  public async resendContract(contractId: string): Promise<void> {
    const contract = await this.docusignContractRepository.findOne({
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

    if (!contract) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.docusignStatus === EExtDocusignStatus.COMPLETED) {
      throw new BadRequestException(`Contract with this id already completed!`);
    }

    if (contract.isAtLeastOneSignersSigned) {
      throw new BadRequestException("At least one signatory already signed the contract");
    }

    const signers = await this.docusignSdkService.getEnvelopeSigners(contract.envelopeId);

    for (const signer of signers) {
      if (signer.status === EExtDocusignCorporateSignerStatus.COMPLETED) {
        throw new BadRequestException("At least one signatory already signed the contract");
      }
    }

    await this.updateSignersData(signers, contract);

    return;
  }

  public async getEditLink(contractId: string): Promise<ICreateContractOutput> {
    const contract = await this.docusignContractRepository.findOne({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with this id not exist!`);
    }

    if (contract.docusignStatus !== EExtDocusignStatus.CREATED) {
      throw new BadRequestException(`Contract with this status is not editable!`);
    }

    const editLink = await this.docusignSdkService.getEnvelopeEditLink(contract.envelopeId);

    return { contractId: contract.id, editLink };
  }

  private async updateSignersData(signers: IRecipientInterface[], contract: DocusignContract): Promise<void> {
    if (!contract.company) {
      throw new BadRequestException(`Company for contract ${contract.id} does not exist!`);
    }

    if (!contract.company?.contractSigners) {
      throw new BadRequestException("Contract signers not filling");
    }

    if (!contract.company.superAdmin || contract.company.superAdmin.userRoles.length === 0) {
      throw new BadRequestException(`Company with id ${contract.company.id} does not have superAdmin!`);
    }

    const superAdminRole = this.getSuperAdminRoleByCompanyType(
      contract.company.companyType,
      contract.company.superAdmin.userRoles,
    );

    if (!superAdminRole) {
      throw new BadRequestException(`Company ${contract.company.id} does not have superAdmin role`);
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
