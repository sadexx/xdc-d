import { SelectQueryBuilder } from "typeorm";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { ELanguageLevel, ESignLanguages } from "src/modules/interpreters/profile/common/enum";
import { Injectable } from "@nestjs/common";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { EUserGender, EUserRoleName } from "src/modules/users/common/enums";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";

@Injectable()
export class SearchEngineQueryOptionsService {
  private readonly EARTH_RADIUS: number = 6371;
  private readonly PRE_BOOKED_RADIUS: number = 150;
  private readonly ON_DEMAND_RADIUS: number = 20;

  /**
   * Applies working hours condition for all companies.
   *
   * This includes filtering by interpreter type, language pairs,
   * and roles associated with interpreter profiles.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param order - The AppointmentOrder containing details such as interpreter type
   * and language requirements.
   */
  public async applyWorkingHoursForAllCompanyCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
  ): Promise<void> {
    const interpreterTypes = this.determineInterpreterType(order.interpreterType);

    query.andWhere("interpreter.isTemporaryBlocked = :blocked", { blocked: false });
    query.andWhere(
      `EXISTS (
      SELECT 1
      FROM language_pairs
      WHERE language_pairs.interpreter_profile_id = interpreter.id
        AND language_pairs.language_from = :languageFrom
        AND language_pairs.language_to = :languageTo
    )`,
      {
        languageFrom: order.languageFrom,
        languageTo: order.languageTo,
      },
    );

    query.andWhere("role.name IN (:...roleNames)", { roleNames: interpreterTypes });
  }

  /**
   * Applies working hours condition for all companies on demand.
   *
   * This includes filtering by interpreter type, language pairs,
   * roles associated with interpreter profiles, and ensuring the interpreter is not busy.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param order - The AppointmentOrder containing details such as interpreter type
   * and language requirements.
   */
  public async applyWorkingHoursForAllCompanyOnDemandCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
  ): Promise<void> {
    const interpreterTypes = this.determineInterpreterType(order.interpreterType);

    query.andWhere("interpreter.endOfWorkDay > :currentTime", { currentTime: new Date() });
    query.andWhere("interpreter.isTemporaryBlocked = :blocked", { blocked: false });
    query.andWhere(
      `EXISTS (
      SELECT 1
      FROM language_pairs
      WHERE language_pairs.interpreter_profile_id = interpreter.id
        AND language_pairs.language_from = :languageFrom
        AND language_pairs.language_to = :languageTo
    )`,
      {
        languageFrom: order.languageFrom,
        languageTo: order.languageTo,
      },
    );

    query.andWhere("role.name IN (:...roleNames)", { roleNames: interpreterTypes });
  }

  /**
   * Applies working hours condition for a specified company.
   *
   * This includes filtering by interpreter type, language pairs,
   * and roles associated with interpreter profiles.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param order - The AppointmentOrder containing details such as interpreter type
   * and language requirements.
   */
  public async applyWorkingHoursForSpecifiedCompanyCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
  ): Promise<void> {
    const interpreterTypes = this.determineInterpreterType(order.interpreterType);

    query.andWhere("interpreter.isTemporaryBlocked = :blocked", { blocked: false });
    query.andWhere(
      `EXISTS (
      SELECT 1
      FROM language_pairs
      WHERE language_pairs.interpreter_profile_id = interpreter.id
        AND language_pairs.language_from = :languageFrom
        AND language_pairs.language_to = :languageTo
    )`,
      {
        languageFrom: order.languageFrom,
        languageTo: order.languageTo,
      },
    );
    query.andWhere("role.name IN (:...roleNames)", { roleNames: interpreterTypes });

    if (order.operatedByMainCorporateCompanyName) {
      query.andWhere("userRole.operatedByMainCorporateCompanyName = :mainCompanyName", {
        mainCompanyName: order.operatedByMainCorporateCompanyName,
      });
    } else {
      query.andWhere("userRole.operatedByCompanyName = :companyName", { companyName: order.operatedByCompanyName });
    }
  }

  /**
   * Determines the interpreter type based on the appointment interpreter type.
   * @param interpreterType - The type of interpreter required for the appointment.
   */
  private determineInterpreterType(interpreterType: EAppointmentInterpreterType): EUserRoleName[] {
    if (interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
      return [
        EUserRoleName.IND_PROFESSIONAL_INTERPRETER,
        EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER,
      ];
    }

    return [EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER];
  }

  /**
   * Applies service condition based on the appointment order.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param order - The AppointmentOrder containing details such as communication type
   * and scheduling type.
   */
  public async applyServiceCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    order: AppointmentOrder,
  ): Promise<void> {
    const isSignLanguageRequired =
      ESignLanguages.includes(order.languageFrom) || ESignLanguages.includes(order.languageTo);

    if (order.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      switch (order.communicationType) {
        case EAppointmentCommunicationType.AUDIO:
          query.andWhere("interpreter.isOnlineForAudio = :isOnlineForAudio", {
            isOnlineForAudio: true,
          });
          break;
        case EAppointmentCommunicationType.VIDEO:
          query.andWhere("interpreter.isOnlineForVideo = :isOnlineForVideo", {
            isOnlineForVideo: true,
          });
          break;
        case EAppointmentCommunicationType.FACE_TO_FACE:
          query.andWhere("interpreter.isOnlineForFaceToFace = :isOnlineForFaceToFace", {
            isOnlineForFaceToFace: true,
          });
          break;
      }
    } else if (order.schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
      switch (order.communicationType) {
        case EAppointmentCommunicationType.AUDIO:
          query.andWhere("interpreter.audioPreBookedSetting = :audioPreBookedSetting", {
            audioPreBookedSetting: true,
          });
          break;
        case EAppointmentCommunicationType.VIDEO:
          query.andWhere("interpreter.videoPreBookedSetting = :videoPreBookedSetting", {
            videoPreBookedSetting: true,
          });
          break;
        case EAppointmentCommunicationType.FACE_TO_FACE:
          query.andWhere("interpreter.faceToFacePreBookedSetting = :faceToFacePreBookedSetting", {
            faceToFacePreBookedSetting: true,
          });
          break;
      }
    }

    if (isSignLanguageRequired) {
      query.andWhere("interpreter.signLanguageSetting = :signLanguageSetting", {
        signLanguageSetting: true,
      });
    }
  }

  /**
   * Applies face-to-face pre-booked condition based on location.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param latitude - The latitude to filter by.
   * @param longitude - The longitude to filter by.
   */
  public async applyFaceToFacePreBookedCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    query.innerJoin("userRole.address", "address").andWhere(
      `(:earthRadius * acos(
         cos(radians(:latitude)) * cos(radians(address.latitude)) *
         cos(radians(address.longitude) - radians(:longitude))
         + sin(radians(:latitude)) * sin(radians(address.latitude))
       )) <= :radius`,
      { earthRadius: this.EARTH_RADIUS, latitude, longitude, radius: this.PRE_BOOKED_RADIUS },
    );
  }

  /**
   * Applies face-to-face on-demand condition based on location.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param latitude - The latitude to filter by.
   * @param longitude - The longitude to filter by.
   */
  public async applyFaceToFaceOnDemandCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    query.andWhere(
      `(:earthRadius * acos(
      cos(radians(:latitude)) *
      cos(radians(interpreter.latitude)) *
      cos(radians(interpreter.longitude) - radians(:longitude)) + 
      sin(radians(:latitude)) * sin(radians(interpreter.latitude)))) <= :radius`,
      { earthRadius: this.EARTH_RADIUS, latitude, longitude, radius: this.ON_DEMAND_RADIUS },
    );
  }

  /**
   * Applies consecutive topic condition based on the appointment topic.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param topic - The topic of the appointment requiring consecutive interpretation.
   */
  public async applyConsecutiveTopicCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    topic: EAppointmentTopic,
  ): Promise<void> {
    switch (topic) {
      case EAppointmentTopic.LEGAL:
        query.andWhere("interpreter.consecutiveLegalSetting = :consecutiveLegalSetting", {
          consecutiveLegalSetting: true,
        });
        break;
      case EAppointmentTopic.MEDICAL:
        query.andWhere("interpreter.consecutiveMedicalSetting = :consecutiveMedicalSetting", {
          consecutiveMedicalSetting: true,
        });
        break;
      case EAppointmentTopic.GENERAL:
        query.andWhere("interpreter.consecutiveGeneralSetting = :consecutiveGeneralSetting", {
          consecutiveGeneralSetting: true,
        });
        break;
    }
  }

  /**
   * Applies consecutive general topic condition.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   */
  public async applyConsecutiveTopicGeneralCondition(query: SelectQueryBuilder<InterpreterProfile>): Promise<void> {
    query.andWhere("interpreter.consecutiveGeneralSetting = :consecutiveGeneralSetting", {
      consecutiveGeneralSetting: true,
    });
  }

  /**
   * Applies gender condition based on the preferred interpreter gender.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param preferredInterpreterGender - The preferred gender of the interpreter.
   */
  public async applyGenderCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    preferredInterpreterGender: EUserGender,
  ): Promise<void> {
    query.innerJoin("userRole.profile", "profile");
    query.andWhere("profile.gender = :gender", {
      gender: preferredInterpreterGender,
    });
  }

  /**
   * Applies different gender condition based on the preferred interpreter gender.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param preferredInterpreterGender - The preferred gender of the interpreter.
   */
  public async applyDifferentGenderCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    preferredInterpreterGender: EUserGender,
  ): Promise<void> {
    query.innerJoin("userRole.profile", "profile");
    query.andWhere("profile.gender != :gender", {
      gender: preferredInterpreterGender,
    });
  }

  /**
   * Applies a condition to the query to filter interpreters with NAATI levels three and four
   * and exclude interpreters who have appointments during the specified time frame.
   *
   * This method modifies the provided query to exclude interpreters who have
   * appointments during the specified time frame. It checks for overlapping
   * appointments with statuses of either 'ACCEPTED' or 'LIVE'. For 'LIVE'
   * appointments, it also considers any extended business end time.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param scheduledStartTime - The start time of the appointment to check for availability.
   * @param scheduledEndTime - The end time of the appointment to check for availability.
   */
  public async applyWithNaatiLevelsThreeAndFourCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
  ): Promise<void> {
    const adjustedStartTime = new Date(scheduledStartTime.getTime());
    const adjustedEndTime = new Date(scheduledEndTime.getTime());

    query.andWhere("interpreter.knownLevels && ARRAY[:...levels]::interpreter_profiles_known_levels_enum[]", {
      levels: [ELanguageLevel.THREE, ELanguageLevel.FOUR],
    });
    query.andWhere(
      `NOT EXISTS (
      SELECT 1
      FROM appointments
      WHERE appointments.interpreter_id = interpreter.user_role_id
        AND (
          (appointments.status = :acceptedStatus
           AND appointments.scheduled_start_time <= :adjustedEndTime
           AND appointments.scheduled_end_time >= :adjustedStartTime) OR
          (appointments.status = :liveStatus AND (
            (appointments.scheduled_start_time <= :adjustedEndTime
             AND appointments.scheduled_end_time >= :adjustedStartTime) OR
            (appointments.business_end_time IS NOT NULL
             AND appointments.business_end_time >= :adjustedStartTime)
          ))
        )
    )`,
      {
        adjustedStartTime: adjustedStartTime,
        adjustedEndTime: adjustedEndTime,
        liveStatus: EAppointmentStatus.LIVE,
        acceptedStatus: EAppointmentStatus.ACCEPTED,
      },
    );
  }

  /**
   * Applies condition for interpreters with NAATI levels three and four, ignoring free slots.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   */
  public async applyWithNaatiLevelsThreeAndFourIgnoreFreeSlotCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
  ): Promise<void> {
    query.andWhere("interpreter.knownLevels && ARRAY[:...levels]::interpreter_profiles_known_levels_enum[]", {
      levels: [ELanguageLevel.THREE, ELanguageLevel.FOUR],
    });
  }

  /**
   * Applies a condition to the query to exclude interpreters with NAATI Level 1
   * and exclude interpreters who have appointments during the specified time frame.
   *
   * This method modifies the provided query to exclude interpreters who have
   * appointments during the specified time frame. It checks for overlapping
   * appointments with statuses of either 'ACCEPTED' or 'LIVE'. For 'LIVE'
   * appointments, it also considers any extended business end time.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param scheduledStartTime - The start time of the appointment to check for availability.
   * @param scheduledEndTime - The end time of the appointment to check for availability.
   */
  public async applyWithoutNaatiFirstLevelCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
  ): Promise<void> {
    const adjustedStartTime = new Date(scheduledStartTime.getTime());
    const adjustedEndTime = new Date(scheduledEndTime.getTime());

    query.andWhere("NOT (interpreter.knownLevels @> ARRAY[:level]::interpreter_profiles_known_levels_enum[])", {
      level: ELanguageLevel.ONE,
    });
    query.andWhere(
      `NOT EXISTS (
      SELECT 1
      FROM appointments
      WHERE appointments.interpreter_id = interpreter.user_role_id
        AND (
          (appointments.status = :acceptedStatus
           AND appointments.scheduled_start_time <= :adjustedEndTime
           AND appointments.scheduled_end_time >= :adjustedStartTime) OR
          (appointments.status = :liveStatus AND (
            (appointments.scheduled_start_time <= :adjustedEndTime
             AND appointments.scheduled_end_time >= :adjustedStartTime) OR
            (appointments.business_end_time IS NOT NULL
             AND appointments.business_end_time >= :adjustedStartTime)
          ))
        )
    )`,
      {
        adjustedStartTime: adjustedStartTime,
        adjustedEndTime: adjustedEndTime,
        liveStatus: EAppointmentStatus.LIVE,
        acceptedStatus: EAppointmentStatus.ACCEPTED,
      },
    );
  }

  /**
   * Applies condition for interpreters without NAATI first level, ignoring free slots.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   */
  public async applyWithoutNaatiFirstLevelIgnoreFreeSlotCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
  ): Promise<void> {
    query.andWhere("NOT (interpreter.knownLevels @> ARRAY[:level]::interpreter_profiles_known_levels_enum[])", {
      level: ELanguageLevel.ONE,
    });
  }

  /**
   * Applies a condition to the query to exclude interpreters who have appointments
   * during the specified time frame.
   *
   * This method modifies the provided query to exclude interpreters who have
   * appointments during the specified time frame. It checks for overlapping
   * appointments with statuses of either 'ACCEPTED' or 'LIVE'. For 'LIVE'
   * appointments, it also considers any extended business end time.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param scheduledStartTime - The start time of the appointment to check for availability.
   * @param scheduledEndTime - The end time of the appointment to check for availability.
   */
  public async applyFreeSlotCondition(
    query: SelectQueryBuilder<InterpreterProfile>,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
  ): Promise<void> {
    const adjustedStartTime = new Date(scheduledStartTime.getTime());
    const adjustedEndTime = new Date(scheduledEndTime.getTime());

    query.andWhere(
      `NOT EXISTS (
      SELECT 1
      FROM appointments
      WHERE appointments.interpreter_id = interpreter.user_role_id
        AND (
          (appointments.status = :acceptedStatus
           AND appointments.scheduled_start_time <= :adjustedEndTime
           AND appointments.scheduled_end_time >= :adjustedStartTime) OR
          (appointments.status = :liveStatus AND (
            (appointments.scheduled_start_time <= :adjustedEndTime
             AND appointments.scheduled_end_time >= :adjustedStartTime) OR
            (appointments.business_end_time IS NOT NULL
             AND appointments.business_end_time >= :adjustedStartTime)
          ))
        )
    )`,
      {
        adjustedStartTime: adjustedStartTime,
        adjustedEndTime: adjustedEndTime,
        liveStatus: EAppointmentStatus.LIVE,
        acceptedStatus: EAppointmentStatus.ACCEPTED,
      },
    );
  }

  /**
   * Applies a condition to the query to exclude interpreters that are blacklisted.
   *
   * This method modifies the provided query to filter out interpreters who are either
   * blocked by the client or have blocked the client. It checks the blacklist table
   * for active blacklist entries involving the client.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param clientId - The ID of the client to check against the blacklist entries.
   */
  public async applyBlacklistCondition(query: SelectQueryBuilder<InterpreterProfile>, clientId: string): Promise<void> {
    query.andWhere(
      `userRole.id NOT IN (
      SELECT blacklists."blocked_user_role_id"
      FROM blacklists
      WHERE blacklists."blocked_by_user_role_id" = :clientUserRoleId
        AND blacklists."is_active" = true
    )
    AND userRole.id NOT IN (
      SELECT blacklists."blocked_by_user_role_id"
      FROM blacklists
      WHERE blacklists."blocked_user_role_id" = :clientUserRoleId
        AND blacklists."is_active" = true
    )`,
      { clientUserRoleId: clientId },
    );
  }

  /**
   *  Applies a condition to the query to filter interpreters based on overtime rates.
   *
   * This method modifies the provided query to include interpreters who are available
   * during the specified time frame, taking into account the interpreter's timezone. It checks
   * if the start and end times are within the working hours of the interpreter's timezone.
   * @param query - The SelectQueryBuilder instance for interpreter profiles.
   * @param scheduledStartTime - The start time of the appointment to check for overtime rates.
   * @param scheduledEndTime - The end time of the appointment to check for overtime rates.
   */

  public async applyTimeZoneRateConditions(
    query: SelectQueryBuilder<InterpreterProfile>,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
  ): Promise<void> {
    query.andWhere(
      `userRole.timezone IS NOT NULL AND (
      (EXTRACT(HOUR FROM :endTime AT TIME ZONE userRole.timezone) < 18 
       OR (EXTRACT(HOUR FROM :endTime AT TIME ZONE userRole.timezone) = 18 
           AND EXTRACT(MINUTE FROM :endTime AT TIME ZONE userRole.timezone) = 0))
      AND
      (EXTRACT(HOUR FROM :startTime AT TIME ZONE userRole.timezone) > 9
       OR (EXTRACT(HOUR FROM :startTime AT TIME ZONE userRole.timezone) = 9
           AND EXTRACT(MINUTE FROM :startTime AT TIME ZONE userRole.timezone) >= 0))
    )`,
      { endTime: scheduledEndTime, startTime: scheduledStartTime },
    );
  }
}
