import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, FindOptionsWhere, In, Repository } from "typeorm";
import { EChartLine, EChartsHomepageLine } from "src/modules/statistics/common/enums";
import {
  GetAppointmentsByInterpretingTypeAndCompanyAndUserDto,
  GetAppointmentsByInterpretingTypeAndCompanyDto,
  GetAppointmentsByLanguageAndCompanyAndUserDto,
  GetAppointmentsByLanguageAndCompanyDto,
  GetAppointmentsWithoutInterpreterByCompanyDto,
  GetCancelledAppointmentsByCompanyAndUserDto,
  GetCancelledAppointmentsByCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
  GetHomepageBaseAppointmentStatisticByCompanyDto,
  GetSpentCostByCompany,
} from "src/modules/statistics/common/dto";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { StatisticsService } from "src/modules/statistics/services";
import {
  APPOINTMENT_INTERPRETING_CRITERIA,
  APPOINTMENT_TYPE_CRITERIA,
} from "src/modules/statistics/common/constants/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { round2 } from "src/common/utils";
import {
  IChartLineDataOutput,
  IGetHomepageBaseAppointmentStatisticOutput,
  IChartHomepageLineDataOutput,
  IChartRoundDataOutput,
} from "src/modules/statistics/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class CompanyStatisticsClientService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly statisticsService: StatisticsService,

    private readonly accessControlService: AccessControlService,
  ) {}

  public async getCreatedVsCompletedAppointmentsByTypeAndCompany(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED]),
              client: {
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByLanguageAndCompany(
    dto: GetAppointmentsByLanguageAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [createdCount, completedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            creationDate: Between(period.startPeriod, period.endPeriod),
            client: {
              operatedByCompanyId: dto.companyId,
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED]),
            client: {
              operatedByCompanyId: dto.companyId,
            },
          },
        }),
      ]);
      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[createdChartLine]?.values.push(createdCount);
      result[createdChartLine]?.labels.push(formatDay);
      result[completedChartLine]?.values.push(completedCount);
      result[completedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompany(
    dto: GetAppointmentsByInterpretingTypeAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const interpretingType of dto.interpretingTypes) {
      const resultByType: IChartLineDataOutput = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED]),
              client: {
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCancelledAppointmentsByCompany(
    dto: GetCancelledAppointmentsByCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const roleName of dto.roleNames) {
      let userRoleName: EUserRoleName | undefined = UNDEFINED_VALUE;

      if (roleName !== "all") {
        userRoleName = roleName as EUserRoleName;
      }

      for (const appointmentType of dto.appointmentTypes) {
        const resultByType: IChartLineDataOutput = {
          [chartLine]: { values: [], labels: [] },
        };

        for (const [index, period] of dates.entries()) {
          const canceledCount = await this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              appointmentAdminInfo: {
                cancellations: {
                  roleName: userRoleName,
                  creationDate: Between(period.startPeriod, period.endPeriod),
                },
              },
              client: {
                operatedByCompanyId: dto.companyId,
              },
            },
          });

          const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

          resultByType[chartLine]?.values.push(canceledCount);
          resultByType[chartLine]?.labels.push(formatDay);
        }

        result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
      }
    }

    return result;
  }

  public async getAppointmentsDurationByCompany(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_DURATION;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        let avgDuration: number = 0;

        const query = this.statisticsService.getAppointmentDurationQuery(
          appointmentType,
          period.startPeriod,
          period.endPeriod,
          APPOINTMENT_TYPE_CRITERIA[appointmentType],
          dto.companyId,
        );

        const avgDiffMinutes: [{ avg_diff_minutes: string }] = await this.appointmentRepository.query(query);

        if (avgDiffMinutes[0].avg_diff_minutes) {
          avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
        }

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(avgDuration);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByTypeAndCompanyAndClient(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                id: dto.userRoleId,
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED]),
              client: {
                id: dto.userRoleId,
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByLanguageAndCompanyAndClient(
    dto: GetAppointmentsByLanguageAndCompanyAndUserDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const [index, period] of dates.entries()) {
      const [createdCount, completedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            creationDate: Between(period.startPeriod, period.endPeriod),
            client: {
              id: dto.userRoleId,
              operatedByCompanyId: dto.companyId,
            },
          },
        }),
        this.appointmentRepository.count({
          where: {
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            updatingDate: Between(period.startPeriod, period.endPeriod),
            status: In([EAppointmentStatus.COMPLETED]),
            client: {
              id: dto.userRoleId,
              operatedByCompanyId: dto.companyId,
            },
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[createdChartLine]?.values.push(createdCount);
      result[createdChartLine]?.labels.push(formatDay);
      result[completedChartLine]?.values.push(completedCount);
      result[completedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompanyAndClient(
    dto: GetAppointmentsByInterpretingTypeAndCompanyAndUserDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const createdChartLine: EChartLine = EChartLine.CREATED_APPOINTMENTS;
    const completedChartLine: EChartLine = EChartLine.COMPLETED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [createdChartLine]: { values: [], labels: [] },
      [completedChartLine]: { values: [], labels: [] },
    };

    for (const interpretingType of dto.interpretingTypes) {
      const resultByType: IChartLineDataOutput = {
        [createdChartLine]: { values: [], labels: [] },
        [completedChartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const [createdCount, completedCount] = await Promise.all([
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              creationDate: Between(period.startPeriod, period.endPeriod),
              client: {
                id: dto.userRoleId,
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
          this.appointmentRepository.count({
            where: {
              interpretingType: APPOINTMENT_INTERPRETING_CRITERIA[interpretingType],
              updatingDate: Between(period.startPeriod, period.endPeriod),
              status: In([EAppointmentStatus.COMPLETED]),
              client: {
                id: dto.userRoleId,
                operatedByCompanyId: dto.companyId,
              },
            },
          }),
        ]);

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[createdChartLine]?.values.push(createdCount);
        resultByType[createdChartLine]?.labels.push(formatDay);
        resultByType[completedChartLine]?.values.push(completedCount);
        resultByType[completedChartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, createdChartLine);
      result = this.statisticsService.updateResultFromArray(resultByType, result, completedChartLine);
    }

    return result;
  }

  public async getCancelledAppointmentsByCompanyAndClient(
    dto: GetCancelledAppointmentsByCompanyAndUserDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.CANCELLED_APPOINTMENTS;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const canceledCount = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            appointmentAdminInfo: {
              cancellations: {
                creationDate: Between(period.startPeriod, period.endPeriod),
              },
            },
            client: {
              id: dto.userRoleId,
              operatedByCompanyId: dto.companyId,
            },
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(canceledCount);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getAppointmentsDurationByCompanyAndClient(
    dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_DURATION;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {
      [chartLine]: { values: [], labels: [] },
    };

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        let avgDuration: number = 0;

        const query = this.statisticsService.getAppointmentDurationQuery(
          appointmentType,
          period.startPeriod,
          period.endPeriod,
          APPOINTMENT_TYPE_CRITERIA[appointmentType],
          dto.companyId,
          dto.userRoleId,
        );

        const avgDiffMinutes: [{ avg_diff_minutes: string }] = await this.appointmentRepository.query(query);

        if (avgDiffMinutes[0].avg_diff_minutes) {
          avgDuration = Math.round(Number(avgDiffMinutes[0].avg_diff_minutes));
        }

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(avgDuration);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getHomepageBaseAppointmentInfoByCompanyId(
    dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    user: ITokenUserData,
  ): Promise<IGetHomepageBaseAppointmentStatisticOutput> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      updatingDate: Between(dateFrom, dateTo),
      status: In([EAppointmentStatus.COMPLETED]),
      client: {
        operatedByCompanyId: dto.companyId,
      },
    };

    const appointmentDurationQuery =
      "SELECT SUM( " +
      "CASE " +
      `WHEN appointments.communication_type = '${EAppointmentCommunicationType.FACE_TO_FACE}' THEN EXTRACT(EPOCH FROM (appointments.business_end_time - appointments.scheduled_start_time)) / 60 ` +
      "ELSE " +
      "CASE " +
      "WHEN appointments.client_last_active_time IS NULL THEN 0 " +
      "WHEN appointments.client_last_active_time < appointments.scheduled_start_time THEN 0 " +
      "ELSE EXTRACT(EPOCH FROM (appointments.client_last_active_time - appointments.scheduled_start_time)) / 60 " +
      "END " +
      "END " +
      ") AS total_duration_in_minutes " +
      "FROM appointments " +
      "JOIN user_roles ON appointments.client_id = user_roles.id " +
      `WHERE user_roles.operated_by_company_id = '${dto.companyId}' ` +
      `AND appointments.status IN ('${EAppointmentStatus.COMPLETED}') `;

    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const onDemandCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.ON_DEMAND,
      },
    });

    const preBookedCount = await this.appointmentRepository.count({
      where: {
        ...appointmentCountWhere,
        schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
      },
    });

    const [onDemandDuration]: [{ total_duration_in_minutes: string }] = await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.ON_DEMAND}';`,
    );

    const [preBookedDuration]: [{ total_duration_in_minutes: string }] = await this.appointmentRepository.query(
      appointmentDurationQuery + `AND appointments.scheduling_type = '${EAppointmentSchedulingType.PRE_BOOKED}';`,
    );

    return {
      all: {
        count: onDemandCount + preBookedCount,
        duration:
          Number(onDemandDuration.total_duration_in_minutes) + Number(preBookedDuration.total_duration_in_minutes),
      },
      onDemand: {
        count: onDemandCount,
        duration: Number(onDemandDuration.total_duration_in_minutes),
      },
      preBooked: {
        count: preBookedCount,
        duration: Number(preBookedDuration.total_duration_in_minutes),
      },
    };
  }

  public async getHomepageChartsAppointmentInfoByCompanyId(
    dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartHomepageLineDataOutput> {
    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const allChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ALL;
    const onDemandChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_ON_DEMAND;
    const preBookedChartLine: EChartsHomepageLine = EChartsHomepageLine.COMPLETED_APPOINTMENTS_PRE_BOOKED;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    const result: IChartHomepageLineDataOutput = {
      [allChartLine]: { values: [], labels: [] },
      [onDemandChartLine]: { values: [], labels: [] },
      [preBookedChartLine]: { values: [], labels: [] },
    };

    const appointmentCountWhere: FindOptionsWhere<Appointment> = {
      status: In([EAppointmentStatus.COMPLETED]),
      client: {
        operatedByCompanyId: dto.companyId,
      },
    };

    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    for (const [index, period] of dates.entries()) {
      const [allCount, onDemandCount, preBookedCount] = await Promise.all([
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.ON_DEMAND,
          },
        }),
        this.appointmentRepository.count({
          where: {
            ...appointmentCountWhere,
            creationDate: Between(period.startPeriod, period.endPeriod),
            schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          },
        }),
      ]);

      const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

      result[allChartLine]?.values.push(allCount);
      result[allChartLine]?.labels.push(formatDay);
      result[onDemandChartLine]?.values.push(onDemandCount);
      result[onDemandChartLine]?.labels.push(formatDay);
      result[preBookedChartLine]?.values.push(preBookedCount);
      result[preBookedChartLine]?.labels.push(formatDay);
    }

    return result;
  }

  public async getAppointmentsWithoutInterpreterByTypeAndCompany(
    dto: GetAppointmentsWithoutInterpreterByCompanyDto,
    user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    const chartLine: EChartLine = EChartLine.APPOINTMENTS_WITHOUT_INTERPRETER;

    const statisticType = this.statisticsService.getStatisticType(dateFrom, dateTo);
    const dates = this.statisticsService.getDatesByStatisticType(dateFrom, dateTo, statisticType);

    let result: IChartLineDataOutput = {};

    for (const appointmentType of dto.appointmentTypes) {
      const resultByType: IChartLineDataOutput = {
        [chartLine]: { values: [], labels: [] },
      };

      for (const [index, period] of dates.entries()) {
        const count = await this.appointmentRepository.count({
          where: {
            ...APPOINTMENT_TYPE_CRITERIA[appointmentType],
            status: EAppointmentStatus.CANCELLED_BY_SYSTEM,
            languageFrom: dto.languageFrom,
            languageTo: dto.languageTo,
            appointmentAdminInfo: {
              isInterpreterFound: false,
            },
            client: {
              operatedByCompanyId: dto.companyId,
            },
            updatingDate: Between(period.startPeriod, period.endPeriod),
          },
        });

        const formatDay = this.statisticsService.formatDate(period.endPeriod, statisticType, index);

        resultByType[chartLine]?.values.push(count);
        resultByType[chartLine]?.labels.push(formatDay);
      }

      result = this.statisticsService.updateResultFromArray(resultByType, result, chartLine);
    }

    return result;
  }

  public async getSpentCostByCompany(dto: GetSpentCostByCompany, user: ITokenUserData): Promise<IChartRoundDataOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    const { dateFrom, dateTo } = this.statisticsService.getDates(dto.dateFrom, dto.dateTo);
    this.statisticsService.getStatisticType(dateFrom, dateTo);

    const result: IChartRoundDataOutput = {
      all: 0,
      onDemand: 0,
      preBooked: 0,
      chart: [],
    };

    const aggregatedAppointments = await this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("appointment.interpretingType", "interpretingType")
      .addSelect("appointment.schedulingType", "schedulingType")
      .addSelect("SUM(CAST(appointment.paidByClient AS float))", "paidByClient")
      .innerJoin("appointment.client", "client")
      .where("appointment.creationDate BETWEEN :start AND :end", { start: dateFrom, end: dateTo })
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: [EAppointmentStatus.COMPLETED],
      })
      .andWhere("client.operatedByCompanyId = :companyId", { companyId: dto.companyId })
      .groupBy("appointment.interpretingType")
      .addGroupBy("appointment.schedulingType")
      .getRawMany<Appointment>();

    const interpretingTypeMap: Record<string, number> = {};

    for (const appointment of aggregatedAppointments) {
      const { interpretingType, schedulingType } = appointment;
      const paidByClient = Number(appointment.paidByClient);

      result.all += paidByClient;

      if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
        result.onDemand += paidByClient;
      } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
        result.preBooked += paidByClient;
      }

      interpretingTypeMap[interpretingType] = (interpretingTypeMap[interpretingType] || 0) + paidByClient;
    }

    result.all = round2(result.all);
    result.onDemand = round2(result.onDemand);
    result.preBooked = round2(result.preBooked);

    for (const type in interpretingTypeMap) {
      result.chart.push({ label: type, value: round2(interpretingTypeMap[type]) });
    }

    return result;
  }
}
