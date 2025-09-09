import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { hash, verify } from "argon2";
import { Repository } from "typeorm";
import { Session } from "src/modules/sessions/entities";
import { ICreateTokensData } from "src/modules/auth/common/interfaces";
import { OneRoleLoginOutput } from "src/modules/auth/common/outputs";
import { TokensService } from "src/modules/tokens/services";
import {
  ICreateSession,
  IStartSessionData,
  IUpsertSessionData,
  IVerifySessionData,
} from "src/modules/sessions/common/interfaces";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ESortOrder } from "src/common/enums";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import {
  DeleteOldestSessionQuery,
  GetLastSessionQuery,
  TDeleteOldestSession,
  TGetLastSession,
  TUpdateSession,
  TVerifySession,
  UpdateSessionQuery,
  VerifySessionQuery,
} from "src/modules/sessions/common/types";

@Injectable()
export class SessionsService {
  private readonly SESSIONS_LIMIT: number = 3;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly tokensService: TokensService,
  ) {}

  public async getLastSession(userId: string): Promise<TGetLastSession | null> {
    const lastSession = await findOneTyped<TGetLastSession>(this.sessionsRepository, {
      select: GetLastSessionQuery.select,
      where: { userId: userId },
      order: { creationDate: ESortOrder.DESC },
    });

    return lastSession;
  }

  public async startSession(data: IStartSessionData): Promise<OneRoleLoginOutput> {
    const tokens = await this.selectTokens(data);
    await this.deleteAllSessionsByDevice(data.deviceId);
    await this.createSession({ ...data, refreshToken: tokens.refreshToken });

    return tokens;
  }

  public async updateActiveSession(data: IStartSessionData): Promise<OneRoleLoginOutput> {
    const tokens = await this.selectTokens(data);
    await this.updateSession({ ...data, refreshToken: tokens.refreshToken });

    return tokens;
  }

  public async verifySession(data: IVerifySessionData): Promise<TVerifySession> {
    const session = await findOneOrFailTyped<TVerifySession>(
      data.userId,
      this.sessionsRepository,
      {
        select: VerifySessionQuery.select,
        where: { userId: data.userId, clientIPAddress: data.clientIPAddress, clientUserAgent: data.clientUserAgent },
        order: { updatingDate: ESortOrder.DESC },
      },
      "userId",
    );

    const isRefreshTokenCorrect = await verify(session.refreshToken, data.refreshToken);

    if (isRefreshTokenCorrect) {
      return session;
    }

    if (session.firstStageToken) {
      const isOldRefreshTokenCorrect = await verify(session.firstStageToken, data.refreshToken);

      if (isOldRefreshTokenCorrect) {
        return session;
      }
    }

    throw new NotFoundException("Your token is out of date");
  }

  private async selectTokens(data: IStartSessionData): Promise<OneRoleLoginOutput> {
    const tokenPayload: ICreateTokensData = {
      userId: data.userId,
      userRoleId: data.userRoleId,
      userRole: data.userRole,
      clientIPAddress: data.clientIPAddress,
      clientUserAgent: data.clientUserAgent,
    };

    if (!data.isRequiredInfoFulfilled) {
      return this.tokensService.createRequiredInfoTokens(tokenPayload);
    }

    if (!data.isActive) {
      return this.tokensService.createActivationTokens(tokenPayload);
    }

    return this.tokensService.createFullAccessTokens(tokenPayload);
  }

  private async createSession(data: IUpsertSessionData): Promise<void> {
    const sessionCount = await this.sessionsRepository.count({
      where: { userId: data.userId },
    });

    if (sessionCount >= this.SESSIONS_LIMIT) {
      await this.deleteOldestSession(data.userId);
    }

    const sessionDto = await this.constructSessionDto(data);
    await this.sessionsRepository.save(sessionDto);
  }

  private async updateSession(data: IUpsertSessionData): Promise<void> {
    const userSession = await findOneOrFailTyped<TUpdateSession>(
      data.userId,
      this.sessionsRepository,
      {
        select: UpdateSessionQuery.select,
        where: { userId: data.userId, platform: data.platform, deviceId: data.deviceId },
        order: { updatingDate: ESortOrder.DESC },
      },
      "userId",
    );

    const sessionDto = await this.constructSessionDto(data);
    const firstStageToken = data.isUpdateFirstStageToken ? userSession.refreshToken : null;

    await this.sessionsRepository.update(userSession.id, {
      ...sessionDto,
      firstStageToken,
    });
  }

  private async constructSessionDto(data: IUpsertSessionData): Promise<ICreateSession> {
    const hashedRefreshToken = await hash(data.refreshToken, {
      timeCost: this.configService.getOrThrow<number>("hashing.argon2TimeCost"),
    });
    const refreshTokenExpirationTimeSeconds = this.configService.getOrThrow<number>(
      "jwt.refresh.expirationTimeSeconds",
    );

    const expirationDate = new Date(Date.now() + refreshTokenExpirationTimeSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND);

    return {
      userId: data.userId,
      userRoleId: data.userRoleId,
      platform: data.platform,
      deviceId: data.deviceId,
      deviceToken: data.deviceToken,
      iosVoipToken: data.iosVoipToken,
      clientIPAddress: data.clientIPAddress,
      clientUserAgent: data.clientUserAgent,
      refreshToken: hashedRefreshToken,
      refreshTokenExpirationDate: expirationDate,
    };
  }

  private async deleteOldestSession(userId: string): Promise<void> {
    const session = await findOneOrFailTyped<TDeleteOldestSession>(
      userId,
      this.sessionsRepository,
      { select: DeleteOldestSessionQuery.select, where: { userId }, order: { creationDate: ESortOrder.ASC } },
      "userId",
    );
    await this.sessionsRepository.delete(session.id);
  }

  private async deleteAllSessionsByDevice(deviceId: string): Promise<void> {
    await this.sessionsRepository.delete({ deviceId });
  }
}
