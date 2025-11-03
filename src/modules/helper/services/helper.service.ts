import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { LFH_ADMIN_ROLES, NUMBER_OF_SECONDS_IN_HOUR } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import { TGetUserRoleByName } from "src/modules/helper/common/types";
import { EHelperErrorCodes } from "src/modules/helper/common/enums";

@Injectable()
export class HelperService {
  private readonly lokiLogger = new LokiLogger(HelperService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly redisService: RedisService,
  ) {}

  /**
   ** User Repository
   */

  public async getSuperAdmin(): Promise<User[]> {
    const CACHE_KEY = "super-admins";
    const cachedData = await this.redisService.getJson<User[]>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const superAdmins = await this.userRepository.find({
      where: { userRoles: { role: { name: EUserRoleName.SUPER_ADMIN } } },
      select: { id: true, email: true },
    });

    if (superAdmins.length === 0) {
      this.lokiLogger.error("No Super Admins found in the system");
      throw new BadRequestException(EHelperErrorCodes.NO_SUPER_ADMINS_FOUND);
    }

    await this.redisService.setJson(CACHE_KEY, superAdmins, NUMBER_OF_SECONDS_IN_HOUR);

    return superAdmins;
  }

  /**
   ** UserRole Repository
   */

  public async getAllLfhAdmins(): Promise<UserRole[]> {
    const CACHE_KEY = "lfh-admins";
    const cachedData = await this.redisService.getJson<UserRole[]>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const lfhAdmins = await this.userRoleRepository.find({
      select: {
        id: true,
        user: {
          email: true,
        },
        role: {
          name: true,
        },
      },
      where: {
        role: { name: In(LFH_ADMIN_ROLES) },
      },
      relations: {
        role: true,
        user: true,
      },
    });

    if (lfhAdmins.length === 0) {
      this.lokiLogger.error("No Admins found in Lfh Company");
      throw new BadRequestException(EHelperErrorCodes.NO_LFH_ADMINS_FOUND);
    }

    await this.redisService.setJson(CACHE_KEY, lfhAdmins, NUMBER_OF_SECONDS_IN_HOUR);

    return lfhAdmins;
  }

  /**
   ** Other Without Repository
   */

  public async getUserRoleByName<TReturnType>(
    user: TGetUserRoleByName,
    roleName: EUserRoleName | readonly EUserRoleName[],
  ): Promise<TReturnType> {
    if (!user) {
      throw new BadRequestException(EHelperErrorCodes.USER_DOES_NOT_EXIST);
    }

    if (!user.userRoles) {
      throw new BadRequestException(EHelperErrorCodes.USER_NO_ROLES_ASSIGNED);
    }

    const userRole = user.userRoles.find((userRole) =>
      Array.isArray(roleName) ? roleName.includes(userRole.role.name) : userRole.role.name === roleName,
    );

    if (!userRole) {
      throw new NotFoundException(EHelperErrorCodes.ROLE_NOT_FOUND);
    }

    return userRole as TReturnType;
  }
}
