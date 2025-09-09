import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InterpreterProfile, LanguagePair } from "src/modules/interpreters/profile/entities";
import { Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import {
  INTERPRETER_ROLES,
  LFH_ADMIN_ROLES,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_QUARTER_HOUR,
} from "src/common/constants";
import { User } from "src/modules/users/entities";
import {
  GetAvailableLanguagePairsDto,
  GetDropdownCompaniesDto,
  GetDropdownUsersDto,
} from "src/modules/toolbox/common/dto";
import { ToolboxQueryOptionsService } from "src/modules/toolbox/services";
import {
  IGetActiveAndInactiveLanguagesOutput,
  IGetAvailableLanguagePairsOutput,
  IGetInterpreterAvailabilityOutput,
  IGetSidebarMessagesOutput,
  IUnreadChannelMessagesOutput,
} from "src/modules/toolbox/common/outputs";
import { ELanguages, ESignLanguages } from "src/modules/interpreters/profile/common/enum";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Notification } from "src/modules/notifications/entities";
import { UserRole } from "src/modules/users/entities";
import { RedisService } from "src/modules/redis/services";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";

@Injectable()
export class ToolboxService {
  constructor(
    @InjectRepository(LanguagePair)
    private readonly languagePairRepository: Repository<LanguagePair>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly toolboxQueryOptionsService: ToolboxQueryOptionsService,
    private readonly redisService: RedisService,
  ) {}

  public async getLanguagesAvailability(): Promise<IGetActiveAndInactiveLanguagesOutput> {
    const CACHE_KEY = "languages-availability";
    const cachedData = await this.redisService.getJson<IGetActiveAndInactiveLanguagesOutput>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const queryOptions = this.toolboxQueryOptionsService.getActiveLanguagesOptions();
    const result: { language: ELanguages }[] = await this.languagePairRepository.query(queryOptions);

    const allLanguages = Object.values(ELanguages);
    const activeLanguages = result.map((row) => row.language);
    const activeLanguagesSet = new Set(activeLanguages);
    const inactiveLanguages = allLanguages.filter((language) => !activeLanguagesSet.has(language));

    await this.redisService.setJson(
      CACHE_KEY,
      { activeLanguages, inactiveLanguages, signLanguages: ESignLanguages },
      NUMBER_OF_MINUTES_IN_QUARTER_HOUR * NUMBER_OF_MINUTES_IN_HOUR,
    );

    return { activeLanguages, inactiveLanguages, signLanguages: ESignLanguages };
  }

  public async getDropdownCompanies(dto: GetDropdownCompaniesDto): Promise<Company[]> {
    const queryBuilder = this.companyRepository.createQueryBuilder("company");
    this.toolboxQueryOptionsService.getDropdownCompaniesOptions(queryBuilder, dto);

    return queryBuilder.getMany();
  }

  public async getDropdownUsers(dto: GetDropdownUsersDto, user: ITokenUserData): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder("user");
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
    });
    this.toolboxQueryOptionsService.getDropdownUsersOptions(queryBuilder, dto, userRole);

    return queryBuilder.getMany();
  }

  public async getSidebarMessages(user: IWebSocketUserData): Promise<IGetSidebarMessagesOutput> {
    let hasNewCompanyRequests: boolean = false;
    let hasAppointmentOrders: boolean = false;

    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      const hasNewCompanyRequestsQueryBuilder = this.companyRepository.createQueryBuilder("company");
      this.toolboxQueryOptionsService.hasNewCompanyRequestsQueryOptions(hasNewCompanyRequestsQueryBuilder);
      hasNewCompanyRequests = await hasNewCompanyRequestsQueryBuilder.getExists();
    }

    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      const hasAppointmentOrdersQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("order");
      this.toolboxQueryOptionsService.hasAppointmentOrdersQueryOptions(
        hasAppointmentOrdersQueryBuilder,
        user.userRoleId,
      );
      hasAppointmentOrders = await hasAppointmentOrdersQueryBuilder.getExists();
    }

    const hasUnreadChannelMessages = await this.hasUnreadChannelMessages(user);

    const hasUnreadNotifications = await this.notificationRepository.exists({
      where: { userRoleId: user.userRoleId, isViewed: false },
    });

    return {
      hasNewCompanyRequests,
      hasAppointmentOrders,
      hasUnreadChannelMessages,
      hasUnreadNotifications,
    };
  }

  private async hasUnreadChannelMessages(user: IWebSocketUserData): Promise<IUnreadChannelMessagesOutput | boolean> {
    const supportChannelsQueryBuilder = this.channelMembershipRepository.createQueryBuilder("channelMembership");
    const privateChannelsQueryBuilder = this.channelMembershipRepository.createQueryBuilder("channelMembership");

    this.toolboxQueryOptionsService.hasUnreadSupportChannelMessagesQueryOptions(supportChannelsQueryBuilder, user);
    this.toolboxQueryOptionsService.hasUnreadPrivateChannelMessagesQueryOptions(privateChannelsQueryBuilder, user);

    const [hasUnreadSupportChannelMessages, hasUnreadPrivateChannelMessages] = await Promise.all([
      supportChannelsQueryBuilder.getExists(),
      privateChannelsQueryBuilder.getExists(),
    ]);

    if (!hasUnreadSupportChannelMessages && !hasUnreadPrivateChannelMessages) {
      return false;
    }

    return {
      hasUnreadSupportChannelMessages,
      hasUnreadPrivateChannelMessages,
    };
  }

  public async getInterpretersAvailability(user: ITokenUserData): Promise<IGetInterpreterAvailabilityOutput> {
    const CACHE_KEY = "interpreters-availability";
    const cachedData = await this.redisService.getJson<IGetInterpreterAvailabilityOutput>(CACHE_KEY);

    if (cachedData) {
      return cachedData;
    }

    const currentTime = new Date();
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
    });

    const busyInterpretersQueryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.toolboxQueryOptionsService.busyInterpretersQueryOptions(busyInterpretersQueryBuilder, userRole);
    const busyInterpretersRows = await busyInterpretersQueryBuilder.getRawMany<Appointment>();

    const busyInterpreterIds = Array.from(
      new Set(busyInterpretersRows.map((row) => row.interpreterId).filter((id) => id !== null)),
    );
    const busyInterpretersCount = busyInterpreterIds.length;

    const onlineInterpretersQueryBuilder = this.interpreterProfileRepository.createQueryBuilder("interpreterProfile");
    this.toolboxQueryOptionsService.onlineInterpretersQueryOptions(
      onlineInterpretersQueryBuilder,
      currentTime,
      busyInterpreterIds,
      userRole,
    );
    const onlineInterpretersCount = await onlineInterpretersQueryBuilder.getCount();

    const offlineInterpretersQueryBuilder = this.userRoleRepository.createQueryBuilder("userRole");
    this.toolboxQueryOptionsService.offlineInterpretersQueryOptions(
      offlineInterpretersQueryBuilder,
      currentTime,
      busyInterpreterIds,
      userRole,
    );
    const offlineInterpretersCount = await offlineInterpretersQueryBuilder.getCount();

    await this.redisService.setJson(
      CACHE_KEY,
      { onlineInterpretersCount, busyInterpretersCount, offlineInterpretersCount },
      NUMBER_OF_MINUTES_IN_FIVE_MINUTES * NUMBER_OF_MINUTES_IN_HOUR,
    );

    return {
      onlineInterpretersCount,
      busyInterpretersCount,
      offlineInterpretersCount,
    };
  }

  public async getAvailableLanguagePairs(dto: GetAvailableLanguagePairsDto): Promise<IGetAvailableLanguagePairsOutput> {
    const cacheKey = `available-language-pairs-${dto.language}`;

    const cachedData = await this.redisService.getJson<IGetAvailableLanguagePairsOutput>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const queryOptions = this.toolboxQueryOptionsService.getAvailableLanguagePairsOptions(dto);
    const queryResult: { language: ELanguages }[] = await this.languagePairRepository.query(
      queryOptions.query,
      queryOptions.parameters,
    );

    const result: IGetAvailableLanguagePairsOutput = {
      languages: queryResult.map((row) => row.language),
    };

    await this.redisService.setJson(cacheKey, result, NUMBER_OF_MINUTES_IN_QUARTER_HOUR * NUMBER_OF_MINUTES_IN_HOUR);

    return result;
  }
}
