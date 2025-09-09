import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { Statistic } from "src/modules/statistics/entities";
import { UserRole } from "src/modules/users/entities";
import { EAccountStatus } from "src/modules/users/common/enums";
import { EAppointmentType, EChartLine, EStatisticType } from "src/modules/statistics/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentInterpretingType, EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import {
  ADMIN_INTERPRETER_CRITERIA,
  APPOINTMENT_INTERPRETING_CRITERIA,
  APPOINTMENT_TYPE_CRITERIA,
} from "src/modules/statistics/common/constants/constants";
import {
  ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES,
  ADMIN_STATISTICS_ALLOWED_ROLES,
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
  ROLES_WHICH_CAN_CANCEL_APPOINTMENT,
} from "src/common/constants";
import { ConfigService } from "@nestjs/config";
import { StatisticsService } from "src/modules/statistics/services";
import { EMembershipAssignmentStatus, EMembershipType } from "src/modules/memberships/common/enums";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { endOfDay, startOfDay, subDays } from "date-fns";
import {
  IFillStatisticActiveInterpretersCount,
  IFillStatisticActiveUserRoles,
  IFillStatisticAverageDiffMinutes,
  IFillStatisticTotalValue,
} from "src/modules/statistics/common/interfaces";

@Injectable()
export class FillStatisticsService {
  constructor(
    @InjectRepository(Statistic)
    private readonly statisticRepository: Repository<Statistic>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(MembershipAssignment)
    private readonly membershipAssignmentRepository: Repository<MembershipAssignment>,
    private readonly configService: ConfigService,
    private readonly statisticsService: StatisticsService,
  ) {}

  public async fillRegisteredActiveAndInactiveAccounts(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    let registeredAccountsCountAllRoles = 0;
    let activeAccountsCountAllRoles = 0;

    for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
      const registeredAccountsCount: number = await this.userRoleRepository.count({
        where: { accountStatus: EAccountStatus.ACTIVE, role: { name: roleName } },
      });

      registeredAccountsCountAllRoles += registeredAccountsCount;

      const newRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.REGISTERED_USERS,
        value: registeredAccountsCount,
        userRoleName: roleName,
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newRegisteredAccountsStatisticRecord);

      const activesUsersCount: IFillStatisticActiveUserRoles[] = await this.appointmentRepository.query(
        "SELECT COUNT(DISTINCT user_roles.id) AS active_user_roles " +
          "FROM appointments " +
          "JOIN user_roles ON (appointments.client_id = user_roles.id OR appointments.interpreter_id = user_roles.id) " +
          "JOIN roles ON (user_roles.role_id = roles.id) " +
          `WHERE appointments.status IN ('${EAppointmentStatus.COMPLETED}') ` +
          `AND roles.role = '${roleName}' ` +
          `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}';`,
      );

      activeAccountsCountAllRoles += Number(activesUsersCount[0].active_user_roles);

      const newActiveAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.ACTIVE_USERS,
        value: Number(activesUsersCount[0].active_user_roles),
        userRoleName: roleName,
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newActiveAccountsStatisticRecord);

      const newInactiveAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.INACTIVE_ACCOUNTS,
        value: registeredAccountsCount - Number(activesUsersCount[0].active_user_roles),
        userRoleName: roleName,
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newInactiveAccountsStatisticRecord);
    }

    const newRegisteredAccountsStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.REGISTERED_USERS,
      value: registeredAccountsCountAllRoles,
      userRoleName: "all",
      date: endPeriod,
      statisticType,
    });

    await this.statisticRepository.save(newRegisteredAccountsStatisticRecord);

    const newActiveAccountsStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.ACTIVE_USERS,
      value: activeAccountsCountAllRoles,
      userRoleName: "all",
      date: endPeriod,
      statisticType,
    });

    await this.statisticRepository.save(newActiveAccountsStatisticRecord);

    const newInactiveAccountsStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.INACTIVE_ACCOUNTS,
      value: registeredAccountsCountAllRoles - activeAccountsCountAllRoles,
      userRoleName: "all",
      date: endPeriod,
      statisticType,
    });

    await this.statisticRepository.save(newInactiveAccountsStatisticRecord);
  }

  public async fillUnsuccessfulRegistrationAttemptsAccounts(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    let unsuccessfulRegisteredCountAllRoles = 0;

    for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
      const unsuccessfulRegisteredCount: number = await this.userRoleRepository.count({
        where: {
          profile: { id: IsNull() },
          role: { name: roleName },
          creationDate: Between(startPeriod, endPeriod),
        },
      });

      unsuccessfulRegisteredCountAllRoles += unsuccessfulRegisteredCount;

      const newUnsuccessfulRegisteredAccountsStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.UNSUCCESSFUL_REGISTRATION,
        value: unsuccessfulRegisteredCount,
        userRoleName: roleName,
        date: endPeriod,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newUnsuccessfulRegisteredAccountsStatisticRecord);
    }

    const newUnsuccessfulRegisteredAccountsStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.UNSUCCESSFUL_REGISTRATION,
      value: unsuccessfulRegisteredCountAllRoles,
      userRoleName: "all",
      date: endPeriod,
      statisticType: statisticType,
    });

    await this.statisticRepository.save(newUnsuccessfulRegisteredAccountsStatisticRecord);
  }

  public async fillActiveInterpreters(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    for (const appointmentCount of ADMIN_INTERPRETER_CRITERIA) {
      let activeInterpretersCountAllRoles = 0;

      for (const roleName of ADMIN_STATISTICS_ALLOWED_INTERPRETERS_ROLES) {
        const activeInterpretersCount: IFillStatisticActiveInterpretersCount[] = await this.appointmentRepository.query(
          "SELECT COUNT(*) AS active_interpreters_count " +
            "FROM (SELECT user_roles.id " +
            "FROM user_roles " +
            "JOIN appointments ON user_roles.id = appointments.interpreter_id " +
            "JOIN roles ON (user_roles.role_id = roles.id) " +
            `WHERE appointments.status = '${EAppointmentStatus.COMPLETED}' ` +
            `AND roles.role = '${roleName}' ` +
            `AND appointments.updating_date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}'` +
            "GROUP BY user_roles.id " +
            `HAVING COUNT(appointments.id) >= ${appointmentCount} ` +
            ") AS subquery;",
        );

        activeInterpretersCountAllRoles += Number(activeInterpretersCount[0].active_interpreters_count);

        const newActiveInterpretersStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.ACTIVE_INTERPRETERS,
          value: Number(activeInterpretersCount[0].active_interpreters_count),
          userRoleName: roleName,
          date: endPeriod,
          interpreterAppointmentCriteria: appointmentCount,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newActiveInterpretersStatisticRecord);
      }

      const newActiveInterpretersStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.ACTIVE_INTERPRETERS,
        value: activeInterpretersCountAllRoles,
        userRoleName: "all",
        date: endPeriod,
        interpreterAppointmentCriteria: appointmentCount,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newActiveInterpretersStatisticRecord);
    }
  }

  public async fillDeletedAccountsDaily(): Promise<void> {
    let deletedCountAllRoles = 0;

    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(
      NUMBER_OF_HOURS_IN_DAY - 1,
      NUMBER_OF_MINUTES_IN_HOUR - 1,
      NUMBER_OF_SECONDS_IN_MINUTE - 1,
      NUMBER_OF_MILLISECONDS_IN_SECOND - 1,
    );

    const restoringPeriodInSeconds = this.configService.getOrThrow<number>("jwt.restore.expirationTimeSeconds");
    const deleteRequestDateStart = new Date(
      yesterdayStart.getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
    );

    const deleteRequestDateEnd = new Date(
      yesterdayEnd.getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND,
    );

    for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
      const deletedCount: number = await this.userRoleRepository.count({
        where: {
          isInDeleteWaiting: true,
          deletingDate: Between(deleteRequestDateStart, deleteRequestDateEnd),
          role: { name: roleName },
        },
      });

      deletedCountAllRoles += deletedCount;

      const newDeletedStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.DELETED_ACCOUNTS,
        value: deletedCount,
        userRoleName: roleName,
        date: yesterdayStart,
        statisticType: EStatisticType.DAILY,
      });

      await this.statisticRepository.save(newDeletedStatisticRecord);
    }

    const newNewRegisteredAccountsStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.DELETED_ACCOUNTS,
      value: deletedCountAllRoles,
      userRoleName: "all",
      date: yesterdayStart,
      statisticType: EStatisticType.DAILY,
    });

    await this.statisticRepository.save(newNewRegisteredAccountsStatisticRecord);
  }

  public async fillDeletedAccountsByPeriod(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    let deletedCountAllRoles = 0;

    for (const roleName of ADMIN_STATISTICS_ALLOWED_ROLES) {
      const deletedCount: IFillStatisticTotalValue[] = await this.appointmentRepository.query(
        "SELECT SUM(value) AS total_value " +
          "FROM statistics " +
          `WHERE date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
          `AND chart_line = '${EChartLine.DELETED_ACCOUNTS}' ` +
          `AND user_role_name = '${roleName}' ` +
          `AND statistic_type = '${EStatisticType.DAILY}';`,
      );

      deletedCountAllRoles += Number(deletedCount[0].total_value);

      const newDeletedStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.DELETED_ACCOUNTS,
        value: Number(deletedCount[0].total_value),
        userRoleName: roleName,
        date: endPeriod,
        statisticType,
      });

      await this.statisticRepository.save(newDeletedStatisticRecord);
    }

    const newDeletedStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.DELETED_ACCOUNTS,
      value: deletedCountAllRoles,
      userRoleName: "all",
      date: endPeriod,
      statisticType,
    });

    await this.statisticRepository.save(newDeletedStatisticRecord);
  }

  public async fillCreatedAndCompletedAppointmentsByType(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
      const createdAppointmentCount: number = await this.appointmentRepository.count({
        where: {
          creationDate: Between(startPeriod, endPeriod),
          ...appointmentTypeCriteria,
        },
      });

      const newCreatedAppointmentStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.CREATED_APPOINTMENTS,
        value: createdAppointmentCount,
        date: endPeriod,
        appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newCreatedAppointmentStatisticRecord);

      const completedAppointmentCount: number = await this.appointmentRepository.count({
        where: {
          updatingDate: Between(startPeriod, endPeriod),
          status: In([EAppointmentStatus.COMPLETED]),
          ...appointmentTypeCriteria,
        },
      });

      const newCompletedAppointmentStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.COMPLETED_APPOINTMENTS,
        value: completedAppointmentCount,
        date: endPeriod,
        appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newCompletedAppointmentStatisticRecord);
    }
  }

  public async fillCreatedAndCompletedAppointmentsByInterpretingType(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    for (const [interpretingTypeName, interpretingTypeCriteria] of Object.entries(APPOINTMENT_INTERPRETING_CRITERIA)) {
      const createdAppointmentCount: number = await this.appointmentRepository.count({
        where: {
          creationDate: Between(startPeriod, endPeriod),
          interpretingType: interpretingTypeCriteria as EAppointmentInterpretingType,
        },
      });

      const newCreatedAppointmentStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.CREATED_APPOINTMENTS,
        value: createdAppointmentCount,
        date: endPeriod,
        interpretingTypeCriteria: interpretingTypeName,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newCreatedAppointmentStatisticRecord);

      const completedAppointmentCount: number = await this.appointmentRepository.count({
        where: {
          updatingDate: Between(startPeriod, endPeriod),
          status: In([EAppointmentStatus.COMPLETED]),
          interpretingType: interpretingTypeCriteria as EAppointmentInterpretingType,
        },
      });

      const newCompletedAppointmentStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.COMPLETED_APPOINTMENTS,
        value: completedAppointmentCount,
        date: endPeriod,
        interpretingTypeCriteria: interpretingTypeName,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newCompletedAppointmentStatisticRecord);
    }
  }

  public async fillCancelledAppointments(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    let cancelledAppointmentCountAllRoles = 0;

    for (const userRoleName of ROLES_WHICH_CAN_CANCEL_APPOINTMENT) {
      for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
        const cancelledAppointmentCount: number = await this.appointmentRepository.count({
          where: {
            appointmentAdminInfo: {
              cancellations: { roleName: userRoleName, creationDate: Between(startPeriod, endPeriod) },
            },
            ...appointmentTypeCriteria,
          },
        });

        const newCancelledAppointmentStatisticRecord = this.statisticRepository.create({
          chartLine: EChartLine.CANCELLED_APPOINTMENTS,
          value: cancelledAppointmentCount,
          date: endPeriod,
          appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
          userRoleName,
          statisticType: statisticType,
        });

        await this.statisticRepository.save(newCancelledAppointmentStatisticRecord);

        cancelledAppointmentCountAllRoles += cancelledAppointmentCount;
      }
    }

    const newCancelledAppointmentStatisticRecord = this.statisticRepository.create({
      chartLine: EChartLine.CANCELLED_APPOINTMENTS,
      value: cancelledAppointmentCountAllRoles,
      date: endPeriod,
      appointmentTypeCriteria: EAppointmentType.ALL,
      userRoleName: "all",
      statisticType: statisticType,
    });

    await this.statisticRepository.save(newCancelledAppointmentStatisticRecord);
  }

  public async fillAppointmentDuration(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    for (const [appointmentTypeName, appointmentTypeCriteria] of Object.entries(APPOINTMENT_TYPE_CRITERIA)) {
      let avgDuration: number = 0;
      const query = this.statisticsService.getAppointmentDurationQuery(
        appointmentTypeName as EAppointmentType,
        startPeriod,
        endPeriod,
        appointmentTypeCriteria,
      );

      const avgDiffMinutes: IFillStatisticAverageDiffMinutes[] = await this.appointmentRepository.query(query);

      if (avgDiffMinutes[0].avg_diff_minutes) {
        avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
      }

      const newAppointmentDurationStatisticRecord = this.statisticRepository.create({
        chartLine: EChartLine.APPOINTMENTS_DURATION,
        value: avgDuration,
        date: endPeriod,
        appointmentTypeCriteria: appointmentTypeName as EAppointmentType,
        statisticType: statisticType,
      });

      await this.statisticRepository.save(newAppointmentDurationStatisticRecord);
    }
  }

  public async fillActiveMembershipsDaily(): Promise<void> {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    for (const membershipType of Object.values(EMembershipType)) {
      const activeMembershipsCount = await this.membershipAssignmentRepository.count({
        where: {
          status: EMembershipAssignmentStatus.ACTIVE,
          currentMembership: { type: membershipType },
          startDate: LessThanOrEqual(yesterdayEnd),
          endDate: MoreThanOrEqual(yesterdayStart),
        },
      });

      const newActiveMembershipRecord = this.statisticRepository.create({
        chartLine: EChartLine.ACTIVE_MEMBERSHIPS,
        statisticType: EStatisticType.DAILY,
        membershipTypeCriteria: membershipType,
        date: yesterdayStart,
        value: activeMembershipsCount,
      });
      await this.statisticRepository.save(newActiveMembershipRecord);
    }
  }

  public async fillActiveMembershipsByPeriod(
    startPeriod: Date,
    endPeriod: Date,
    statisticType: EStatisticType,
  ): Promise<void> {
    for (const membershipType of Object.values(EMembershipType)) {
      const total: IFillStatisticTotalValue[] = await this.statisticRepository.query(
        "SELECT SUM(value) AS total_value " +
          "FROM statistics " +
          `WHERE date BETWEEN '${startPeriod.toISOString()}' AND '${endPeriod.toISOString()}' ` +
          `AND chart_line = '${EChartLine.ACTIVE_MEMBERSHIPS}' ` +
          `AND membership_type_criteria = '${membershipType}' ` +
          `AND statistic_type = '${EStatisticType.DAILY}';`,
      );

      const newActiveMembershipRecord = this.statisticRepository.create({
        chartLine: EChartLine.ACTIVE_MEMBERSHIPS,
        value: Number(total[0].total_value),
        membershipTypeCriteria: membershipType,
        date: endPeriod,
        statisticType,
      });
      await this.statisticRepository.save(newActiveMembershipRecord);
    }
  }

  public async fillStatisticByPeriod(startPeriod: Date, endPeriod: Date, statisticType: EStatisticType): Promise<void> {
    const errors: Error[] = [];

    const executeSafely = async (
      fn: (startPeriod: Date, endPeriod: Date, statisticType: EStatisticType) => Promise<void>,
    ): Promise<void> => {
      const label = fn.name;
      try {
        await fn(startPeriod, endPeriod, statisticType);
      } catch (error) {
        const typedError = error as Error;
        errors.push(new Error(`Function ${label} failed: ${typedError.message}`));
      }
    };

    await executeSafely(this.fillRegisteredActiveAndInactiveAccounts.bind(this));
    await executeSafely(this.fillUnsuccessfulRegistrationAttemptsAccounts.bind(this));
    await executeSafely(this.fillActiveInterpreters.bind(this));

    if (statisticType === EStatisticType.DAILY) {
      await executeSafely(this.fillDeletedAccountsDaily.bind(this));
      await executeSafely(this.fillActiveMembershipsDaily.bind(this));
    } else {
      await executeSafely(this.fillDeletedAccountsByPeriod.bind(this));
      await executeSafely(this.fillActiveMembershipsByPeriod.bind(this));
    }

    await executeSafely(this.fillCreatedAndCompletedAppointmentsByType.bind(this));
    await executeSafely(this.fillCreatedAndCompletedAppointmentsByInterpretingType.bind(this));
    await executeSafely(this.fillCancelledAppointments.bind(this));
    await executeSafely(this.fillAppointmentDuration.bind(this));

    if (errors.length > 0) {
      throw new Error(
        `fillStatisticByPeriod completed with ${errors.length} error(s):\n` +
          errors.map((error) => `- ${error.message}`).join("\n"),
      );
    }
  }
}
