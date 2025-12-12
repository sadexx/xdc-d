import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import {
  GetUserDocumentsDto,
  GetUserInterpreterProfileDto,
  GetUsersDto,
  GetUserStepsDto,
} from "src/modules/admin/common/dto";
import { AccountActivationService } from "src/modules/account-activation/services";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { AdminQueryOptionsService } from "src/modules/admin/services";
import { GetUserDocumentsOutput, GetUserProfileOutput, GetUsersOutput } from "src/modules/admin/common/output";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { findOneOrFailTyped } from "src/common/utils";
import { IAccountRequiredStepsDataOutput } from "src/modules/account-activation/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,

    private readonly adminQueryOptionsService: AdminQueryOptionsService,
    private readonly accountActivationService: AccountActivationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async getUsers(dto: GetUsersDto): Promise<GetUsersOutput> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    this.adminQueryOptionsService.getUsersOptions(queryBuilder, dto);

    const [users, count] = await queryBuilder.getManyAndCount();

    return { data: users, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getUserDocuments(dto: GetUserDocumentsDto): Promise<GetUserDocumentsOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserDocumentsOptions(dto);
    const userDocs = await findOneOrFailTyped<UserRole>(dto.id, this.userRoleRepository, queryOptions);

    return { documents: userDocs };
  }

  public async getUserProfile(userRoleId: string): Promise<GetUserProfileOutput> {
    const queryOptions = this.adminQueryOptionsService.getUserProfileOptions(userRoleId);
    const userProfile = await findOneOrFailTyped<UserRole>(userRoleId, this.userRoleRepository, queryOptions);

    return { profile: userProfile };
  }

  public async getUserSteps(dto: GetUserStepsDto, user: ITokenUserData): Promise<IAccountRequiredStepsDataOutput> {
    const { userRole, accountActivationSteps } =
      await this.accountActivationService.fetchUserAndEvaluateRequiredAndActivationSteps(dto.id, dto.userRole);

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    return accountActivationSteps;
  }

  public async getUserInterpreterProfile(dto: GetUserInterpreterProfileDto): Promise<InterpreterProfile | null> {
    const interpreterProfile = await this.interpreterProfileRepository.findOne({
      where: { userRole: { userId: dto.id, role: { name: dto.userRole } } },
      relations: { cancellationRecord: true },
    });

    return interpreterProfile;
  }
}
