import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { LFH_ADMIN_ROLES, NUMBER_OF_SECONDS_IN_HOUR } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { EGstPayer } from "src/modules/abn/common/enums";
import { OldIIsGstPayers } from "src/modules/payments/common/interfaces";
import { TGetUserRoleByName } from "src/modules/helper/common/types";

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
      throw new BadRequestException("No Super Admins found in the system");
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
      throw new BadRequestException("No Admins found in Lfh Company");
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
      throw new BadRequestException(`User does not exist.`);
    }

    if (!user.userRoles) {
      throw new BadRequestException(`User does not have any roles assigned.`);
    }

    const userRole = user.userRoles.find((userRole) =>
      Array.isArray(roleName) ? roleName.includes(userRole.role.name) : userRole.role.name === roleName,
    );

    if (!userRole) {
      throw new NotFoundException(`The specified role was not found.`);
    }

    return userRole as TReturnType;
  }

  public isIndividualGstPayer(clientCountry: string | null, interpreterIsGstPayer?: EGstPayer | null): OldIIsGstPayers {
    const res = { interpreter: false, client: false };

    if (interpreterIsGstPayer === EGstPayer.YES) {
      res.interpreter = true;
    }

    if (clientCountry === EExtCountry.AUSTRALIA) {
      res.client = true;
    }

    return res;
  }

  public isCorporateGstPayer(clientCountry: string | null, interpreterCountry?: string | null): OldIIsGstPayers {
    const res = { interpreter: false, client: false };

    if (interpreterCountry === EExtCountry.AUSTRALIA) {
      res.interpreter = true;
    }

    if (clientCountry === EExtCountry.AUSTRALIA) {
      res.client = true;
    }

    return res;
  }
}
