import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyDocument } from "src/modules/companies/entities";
import { UploadDocDto } from "src/modules/companies/common/dto";
import { ECompaniesErrorCodes, ECompanyDocumentStatus, ECompanyType } from "src/modules/companies/common/enums";
import { CompanyDocumentIdOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LFH_ADMIN_ROLES } from "src/common/constants";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class CompaniesDocumentsService {
  constructor(
    @InjectRepository(CompanyDocument)
    private readonly companyDocumentRepository: Repository<CompanyDocument>,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async uploadDoc(dto: UploadDocDto, file: IFile, user: ITokenUserData): Promise<CompanyDocumentIdOutput> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException(ECompaniesErrorCodes.COMPANIES_COMMON_COMPANY_NOT_FOUND);
    }

    let documentStatus: ECompanyDocumentStatus = ECompanyDocumentStatus.PENDING;

    if (
      isInRoles(LFH_ADMIN_ROLES, user.role) ||
      company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS
    ) {
      documentStatus = ECompanyDocumentStatus.VERIFIED;
    }

    const document = this.companyDocumentRepository.create({
      type: dto.type,
      s3Key: file.key,
      company: company,
      status: documentStatus,
    });
    const newDocument = await this.companyDocumentRepository.save(document);

    return { id: newDocument.id };
  }

  public async approveDoc(id: string): Promise<void> {
    const document = await findOneOrFailTyped<CompanyDocument>(id, this.companyDocumentRepository, {
      where: { id },
    });

    await this.companyDocumentRepository.update({ id: document.id }, { status: ECompanyDocumentStatus.VERIFIED });

    return;
  }

  public async removeDoc(id: string, user: ITokenUserData): Promise<void> {
    const document = await findOneOrFailTyped<CompanyDocument>(id, this.companyDocumentRepository, {
      where: { id },
      relations: { company: true },
    });

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, document.company);

    await this.companyDocumentRepository.delete({ id });

    return;
  }
}
