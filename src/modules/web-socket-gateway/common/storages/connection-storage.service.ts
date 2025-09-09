import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import { IConnectionData } from "src/modules/web-socket-gateway/common/interfaces";
import { EConnectionTypes } from "src/modules/web-socket-gateway/common/enum";
import { NUMBER_OF_SECONDS_IN_DAY } from "src/common/constants";
import { RedisService } from "src/modules/redis/services";
import { findOneOrFail } from "src/common/utils";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/modules/users/entities";
import { Repository } from "typeorm";

@Injectable()
export class ConnectionStorageService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly redisService: RedisService,
  ) {}

  public async addConnection(connectionType: EConnectionTypes, userRoleId: string, socket: Socket): Promise<void> {
    const key = this.getKey(connectionType, userRoleId);
    const userRole = await findOneOrFail(socket.user.userRoleId, this.userRoleRepository, {
      where: { id: socket.user.userRoleId },
    });

    const value: IConnectionData = {
      socketId: socket.id,
      user: {
        ...socket.user,
        operatedByCompanyId: userRole.operatedByCompanyId,
        operatedByCompanyName: userRole.operatedByCompanyName,
        operatedByMainCorporateCompanyId: userRole.operatedByMainCorporateCompanyId,
        operatedByMainCorporateCompanyName: userRole.operatedByMainCorporateCompanyName,
      },
      connectTime: Date.now(),
    };
    await this.redisService.setJson(key, value, NUMBER_OF_SECONDS_IN_DAY);
  }

  public async getConnection(connectionType: EConnectionTypes, userRoleId: string): Promise<IConnectionData | null> {
    const key = this.getKey(connectionType, userRoleId);

    return await this.redisService.getJson(key);
  }

  public async removeConnection(connectionType: EConnectionTypes, userRoleId: string): Promise<void> {
    const key = this.getKey(connectionType, userRoleId);
    await this.redisService.del(key);
  }

  public async getAllConnections(connectionType: EConnectionTypes): Promise<IConnectionData[]> {
    const keys = await this.redisService.keys(`${connectionType}:*`);
    const connections = [];

    for (const key of keys) {
      const userRoleId = key.split(":")[1];
      const connection = await this.redisService.getJson<IConnectionData>(key);

      if (connection) {
        connections.push({ userRoleId, ...connection });
      }
    }

    return connections;
  }

  private getKey(connectionType: EConnectionTypes, id: string): string {
    return `${connectionType}:${id}`;
  }
}
