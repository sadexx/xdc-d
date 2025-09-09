/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import { round2, round2Nullable } from "src/common/utils";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { IConvertedRateOutput } from "src/modules/rates/common/outputs";
import {
  ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
  ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
  ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
  ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
  ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
  PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
  PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
  PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
  PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
  PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
  RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
  RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
  RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
  STANDARD_RATE_HOUR_END,
  STANDARD_RATE_HOUR_START,
} from "src/modules/rates/common/constants";
import { ERateDetailsSequence, ERateDetailsTime, ERateQualifier, ERateTiming } from "src/modules/rates/common/enums";

@Injectable()
export class RateBuilderService {
  public async generateRateTable(
    interpreterType: EAppointmentInterpreterType,
    onDemandAudioStandardFirst = 28,
  ): Promise<Omit<IConvertedRateOutput, "id">[]> {
    const PAID_TO_INTERPRETER_GENERAL_WITH_GST_FACE_TO_FACE_COEFFICIENT = 0.65;
    const LFH_COMMISSION_GENERAL_FACE_TO_FACE_COEFFICIENT = 0.35;
    const PAID_TO_INTERPRETER_GENERAL_WITH_GST_COEFFICIENT = 0.55;
    const LFH_COMMISSION_GENERAL_COEFFICIENT = 0.45;

    const PAID_TO_INTERPRETER_SPECIAL_WITH_GST_FACE_TO_FACE_COEFFICIENT = 0.65;
    const LFH_COMMISSION_SPECIAL_FACE_TO_FACE_COEFFICIENT = 0.35;
    const PAID_TO_INTERPRETER_SPECIAL_WITH_GST_COEFFICIENT = 0.55;
    const LFH_COMMISSION_SPECIAL_COEFFICIENT = 0.45;

    const TEN_PERCENT = 0.1;

    const ON_DEMAND_AUDIO_STANDARD_ADDITIONAL = (onDemandAudioStandardFirst - onDemandAudioStandardFirst * 0.05) / 3;

    const ON_DEMAND_AUDIO_AFTER_FIRST = onDemandAudioStandardFirst + onDemandAudioStandardFirst * 0.4;
    const ON_DEMAND_AUDIO_AFTER_ADDITIONAL = (ON_DEMAND_AUDIO_AFTER_FIRST - ON_DEMAND_AUDIO_AFTER_FIRST * 0.05) / 3;

    const PRE_BOOKED_VIDEO_STANDARD_FIRST = onDemandAudioStandardFirst * 2 + onDemandAudioStandardFirst * 2 * 0.2;
    const PRE_BOOKED_VIDEO_STANDARD_ADDITIONAL =
      (PRE_BOOKED_VIDEO_STANDARD_FIRST - PRE_BOOKED_VIDEO_STANDARD_FIRST * 0.05) / 6;
    const PRE_BOOKED_VIDEO_AFTER_FIRST = PRE_BOOKED_VIDEO_STANDARD_FIRST + PRE_BOOKED_VIDEO_STANDARD_FIRST * 0.4;
    const PRE_BOOKED_VIDEO_AFTER_ADDITIONAL = (PRE_BOOKED_VIDEO_AFTER_FIRST - PRE_BOOKED_VIDEO_AFTER_FIRST * 0.05) / 6;
    const ON_DEMAND_VIDEO_STANDARD_FIRST =
      PRE_BOOKED_VIDEO_STANDARD_FIRST / 2 + (PRE_BOOKED_VIDEO_STANDARD_FIRST / 2) * 0.1;

    const ON_DEMAND_VIDEO_STANDARD_ADDITIONAL =
      (ON_DEMAND_VIDEO_STANDARD_FIRST - ON_DEMAND_VIDEO_STANDARD_FIRST * 0.05) / 3;

    const ON_DEMAND_VIDEO_AFTER_FIRST = ON_DEMAND_VIDEO_STANDARD_FIRST + ON_DEMAND_VIDEO_STANDARD_FIRST * 0.4;
    const ON_DEMAND_VIDEO_AFTER_ADDITIONAL = (ON_DEMAND_VIDEO_AFTER_FIRST - ON_DEMAND_VIDEO_AFTER_FIRST * 0.05) / 3;

    const PRE_BOOKED_AUDIO_STANDARD_FIRST = onDemandAudioStandardFirst * 2;
    const PRE_BOOKED_AUDIO_STANDARD_ADDITIONAL = ON_DEMAND_AUDIO_STANDARD_ADDITIONAL;
    const PRE_BOOKED_AUDIO_AFTER_FIRST = ON_DEMAND_AUDIO_AFTER_FIRST * 2;
    const PRE_BOOKED_AUDIO_AFTER_ADDITIONAL = ON_DEMAND_AUDIO_AFTER_ADDITIONAL;

    const PRE_BOOKED_F2F_STANDARD_FIRST = onDemandAudioStandardFirst * 6;
    const PRE_BOOKED_F2F_STANDARD_ADDITIONAL =
      ((PRE_BOOKED_F2F_STANDARD_FIRST / 6 - (PRE_BOOKED_F2F_STANDARD_FIRST / 6) * 0.05) / 3) * 2;

    const PRE_BOOKED_F2F_AFTER_FIRST = PRE_BOOKED_F2F_STANDARD_FIRST + PRE_BOOKED_F2F_STANDARD_FIRST * 0.5;
    const PRE_BOOKED_F2F_AFTER_ADDITIONAL =
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_STANDARD_ADDITIONAL * 0.5;

    const ON_DEMAND_F2F_STANDARD_FIRST = PRE_BOOKED_F2F_STANDARD_FIRST + PRE_BOOKED_F2F_STANDARD_FIRST * 0.1;
    const ON_DEMAND_F2F_STANDARD_ADDITIONAL =
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_STANDARD_ADDITIONAL * 0.1;
    const ON_DEMAND_F2F_AFTER_FIRST = PRE_BOOKED_F2F_AFTER_FIRST + PRE_BOOKED_F2F_AFTER_FIRST * 0.1;
    const ON_DEMAND_F2F_AFTER_ADDITIONAL = PRE_BOOKED_F2F_AFTER_ADDITIONAL + PRE_BOOKED_F2F_AFTER_ADDITIONAL * 0.1;

    const PRE_BOOKED_F2F_SIGN_STANDARD_FIRST = onDemandAudioStandardFirst * 8 + onDemandAudioStandardFirst * 8 * 0.1;
    const PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL = PRE_BOOKED_F2F_SIGN_STANDARD_FIRST / 2;
    const PRE_BOOKED_F2F_SIGN_AFTER_FIRST =
      PRE_BOOKED_F2F_SIGN_STANDARD_FIRST + PRE_BOOKED_F2F_SIGN_STANDARD_FIRST * 0.2;
    const PRE_BOOKED_F2F_SIGN_AFTER_ADDITIONAL =
      PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL + PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL * 0.2;

    const ON_DEMAND_F2F_SIGN_STANDARD_FIRST =
      PRE_BOOKED_F2F_SIGN_STANDARD_FIRST + PRE_BOOKED_F2F_SIGN_STANDARD_FIRST * 0.1;
    const ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL = ON_DEMAND_F2F_SIGN_STANDARD_FIRST / 2;
    const ON_DEMAND_F2F_SIGN_AFTER_FIRST = ON_DEMAND_F2F_SIGN_STANDARD_FIRST + ON_DEMAND_F2F_SIGN_STANDARD_FIRST * 0.2;
    const ON_DEMAND_F2F_SIGN_AFTER_ADDITIONAL =
      ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL + ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL * 0.2;

    const PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST = onDemandAudioStandardFirst * 4 + onDemandAudioStandardFirst * 4 * 0.4;
    const PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL =
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST - PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.25;
    const PRE_BOOKED_VIDEO_SIGN_AFTER_FIRST =
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST + PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.1;
    const PRE_BOOKED_VIDEO_SIGN_AFTER_ADDITIONAL =
      PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL + PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL * 0.1;

    const ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST =
      PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST + PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST * 0.1;
    const ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL =
      ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST - ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST * 0.25;
    const ON_DEMAND_VIDEO_SIGN_AFTER_FIRST =
      ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST + ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST * 0.1;
    const ON_DEMAND_VIDEO_SIGN_AFTER_ADDITIONAL =
      ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL + ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL * 0.1;

    const PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY =
      onDemandAudioStandardFirst * 6 - onDemandAudioStandardFirst * 6 * 0.1;
    const PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY =
      ((PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY / 6 - (PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY / 6) * 0.05) /
        3) *
      2;
    const PRE_BOOKED_F2F_AFTER_FIRST_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY + PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY * 0.5;
    const PRE_BOOKED_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY + PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY * 0.5;

    const ON_DEMAND_F2F_STANDARD_FIRST_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY + PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY * 0.1;
    const ON_DEMAND_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY + PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY * 0.1;
    const ON_DEMAND_F2F_AFTER_FIRST_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_AFTER_FIRST_LANGUAGE_BUDDY + PRE_BOOKED_F2F_AFTER_FIRST_LANGUAGE_BUDDY * 0.1;
    const ON_DEMAND_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY =
      PRE_BOOKED_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY + PRE_BOOKED_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY * 0.1;

    const isProfessionalInterpreter = interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER;
    const baseRateField = {
      interpreterType,
      quantity: 0,
      normalHoursStart: STANDARD_RATE_HOUR_START,
      normalHoursEnd: STANDARD_RATE_HOUR_END,
      paidByTakerGeneralWithoutGst: 0,
      paidByTakerSpecialWithGst: null,
      paidByTakerSpecialWithoutGst: null,
      lfhCommissionGeneral: 0,
      lfhCommissionSpecial: null,
      paidToInterpreterGeneralWithGst: 0,
      paidToInterpreterGeneralWithoutGst: 0,
      paidToInterpreterSpecialWithGst: null,
      paidToInterpreterSpecialWithoutGst: null,
    };

    const appointmentTypes: Omit<IConvertedRateOutput, "id">[] = [
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: onDemandAudioStandardFirst,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_STANDARD_ADDITIONAL,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_AFTER_FIRST,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_AUDIO_AFTER_ADDITIONAL,
        ...baseRateField,
      },

      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_STANDARD_FIRST,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_STANDARD_ADDITIONAL,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_AFTER_FIRST,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_AFTER_ADDITIONAL,
        ...baseRateField,
      },

      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_STANDARD_FIRST,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_STANDARD_ADDITIONAL,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_AFTER_FIRST,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_AUDIO_AFTER_ADDITIONAL,
        ...baseRateField,
      },

      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_STANDARD_FIRST,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_STANDARD_ADDITIONAL,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_AFTER_FIRST,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_AFTER_ADDITIONAL,
        ...baseRateField,
      },

      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? ON_DEMAND_F2F_STANDARD_FIRST
          : ON_DEMAND_F2F_STANDARD_FIRST_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? ON_DEMAND_F2F_STANDARD_ADDITIONAL
          : ON_DEMAND_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? ON_DEMAND_F2F_AFTER_FIRST
          : ON_DEMAND_F2F_AFTER_FIRST_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? ON_DEMAND_F2F_AFTER_ADDITIONAL
          : ON_DEMAND_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY,
        ...baseRateField,
      },

      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? PRE_BOOKED_F2F_STANDARD_FIRST
          : PRE_BOOKED_F2F_STANDARD_FIRST_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.STANDARD_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? PRE_BOOKED_F2F_STANDARD_ADDITIONAL
          : PRE_BOOKED_F2F_STANDARD_ADDITIONAL_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? PRE_BOOKED_F2F_AFTER_FIRST
          : PRE_BOOKED_F2F_AFTER_FIRST_LANGUAGE_BUDDY,
        ...baseRateField,
      },
      {
        ...PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS,
        qualifier: ERateQualifier.AFTER_HOURS,
        ...RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
        paidByTakerGeneralWithGst: isProfessionalInterpreter
          ? PRE_BOOKED_F2F_AFTER_ADDITIONAL
          : PRE_BOOKED_F2F_AFTER_ADDITIONAL_LANGUAGE_BUDDY,
        ...baseRateField,
      },
    ];

    if (isProfessionalInterpreter) {
      appointmentTypes.push(
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_STANDARD_FIRST,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_STANDARD_ADDITIONAL,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_AFTER_FIRST,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_F2F_SIGN_AFTER_ADDITIONAL,
          ...baseRateField,
        },

        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_STANDARD_FIRST,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_STANDARD_ADDITIONAL,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_AFTER_FIRST,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_F2F_SIGN_AFTER_ADDITIONAL,
          ...baseRateField,
        },

        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_STANDARD_FIRST,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_STANDARD_ADDITIONAL,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_AFTER_FIRST,
          ...baseRateField,
        },
        {
          ...PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: PRE_BOOKED_VIDEO_SIGN_AFTER_ADDITIONAL,
          ...baseRateField,
        },

        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_STANDARD_FIRST,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.STANDARD_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_STANDARD_ADDITIONAL,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_AFTER_FIRST,
          ...baseRateField,
        },
        {
          ...ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS,
          qualifier: ERateQualifier.AFTER_HOURS,
          ...RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS,
          paidByTakerGeneralWithGst: ON_DEMAND_VIDEO_SIGN_AFTER_ADDITIONAL,
          ...baseRateField,
        },
      );
    }

    let currentQuantity = 1;

    if (interpreterType === EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER) {
      currentQuantity = 43;
    }

    for (const appointmentType of appointmentTypes) {
      if (appointmentType.paidByTakerGeneralWithGst) {
        appointmentType.quantity = currentQuantity;
        appointmentType.interpreterType = interpreterType;
        appointmentType.paidByTakerGeneralWithoutGst = (appointmentType.paidByTakerGeneralWithGst / 11) * 10;

        if (
          appointmentType.interpretingType === EAppointmentInterpretingType.CONSECUTIVE &&
          appointmentType.communicationType === EAppointmentCommunicationType.FACE_TO_FACE
        ) {
          appointmentType.paidToInterpreterGeneralWithGst =
            appointmentType.paidByTakerGeneralWithGst * PAID_TO_INTERPRETER_GENERAL_WITH_GST_FACE_TO_FACE_COEFFICIENT;
          appointmentType.lfhCommissionGeneral =
            appointmentType.paidByTakerGeneralWithGst * LFH_COMMISSION_GENERAL_FACE_TO_FACE_COEFFICIENT;
        } else {
          appointmentType.paidToInterpreterGeneralWithGst =
            appointmentType.paidByTakerGeneralWithGst * PAID_TO_INTERPRETER_GENERAL_WITH_GST_COEFFICIENT;
          appointmentType.lfhCommissionGeneral =
            appointmentType.paidByTakerGeneralWithGst * LFH_COMMISSION_GENERAL_COEFFICIENT;
        }

        appointmentType.paidToInterpreterGeneralWithoutGst =
          (appointmentType.paidToInterpreterGeneralWithGst / 11) * 10;

        if (
          appointmentType.interpretingType === EAppointmentInterpretingType.CONSECUTIVE &&
          appointmentType.interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER
        ) {
          appointmentType.paidByTakerSpecialWithGst =
            appointmentType.paidByTakerGeneralWithGst + appointmentType.paidByTakerGeneralWithGst * TEN_PERCENT;
          appointmentType.paidByTakerSpecialWithoutGst = (appointmentType.paidByTakerSpecialWithGst / 11) * 10;

          if (appointmentType.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
            appointmentType.lfhCommissionSpecial =
              appointmentType.paidByTakerSpecialWithGst * LFH_COMMISSION_SPECIAL_FACE_TO_FACE_COEFFICIENT;

            appointmentType.paidToInterpreterSpecialWithGst =
              appointmentType.paidByTakerSpecialWithGst * PAID_TO_INTERPRETER_SPECIAL_WITH_GST_FACE_TO_FACE_COEFFICIENT;
          } else {
            appointmentType.lfhCommissionSpecial =
              appointmentType.paidByTakerSpecialWithGst * LFH_COMMISSION_SPECIAL_COEFFICIENT;

            appointmentType.paidToInterpreterSpecialWithGst =
              appointmentType.paidByTakerSpecialWithGst * PAID_TO_INTERPRETER_SPECIAL_WITH_GST_COEFFICIENT;
          }

          appointmentType.paidToInterpreterSpecialWithoutGst =
            (appointmentType.paidToInterpreterSpecialWithGst / 11) * 10;
        } else if (
          appointmentType.interpretingType === EAppointmentInterpretingType.SIGN_LANGUAGE &&
          appointmentType.interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER
        ) {
          appointmentType.paidByTakerSpecialWithGst = appointmentType.paidByTakerGeneralWithGst;
          appointmentType.paidByTakerSpecialWithoutGst = appointmentType.paidByTakerGeneralWithoutGst;

          appointmentType.lfhCommissionSpecial = appointmentType.lfhCommissionGeneral;
          appointmentType.paidToInterpreterSpecialWithGst = appointmentType.paidToInterpreterGeneralWithGst;

          appointmentType.paidToInterpreterSpecialWithoutGst = appointmentType.paidToInterpreterGeneralWithoutGst;
        }

        currentQuantity++;
      }
    }

    if (interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER) {
      const PRE_BOOKED_CONFERENCE = 1300;
      const PRE_BOOKED_ESCORT = 1300;

      appointmentTypes.push(
        {
          interpreterType: EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
          quantity: currentQuantity++,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          interpretingType: EAppointmentInterpretingType.SIMULTANEOUS,
          qualifier: ERateQualifier.WORKING_DAY,
          details: ERateTiming.CALCULATED_PER_DAY_8_HOURS,
          detailsSequence: ERateDetailsSequence.ALL_DAY,
          detailsTime: ERateDetailsTime.EIGHT_HOURS,
          normalHoursStart: STANDARD_RATE_HOUR_START,
          normalHoursEnd: STANDARD_RATE_HOUR_END,
          paidByTakerGeneralWithGst: PRE_BOOKED_CONFERENCE,
          paidByTakerGeneralWithoutGst: (PRE_BOOKED_CONFERENCE / 11) * 10,
          paidByTakerSpecialWithGst: PRE_BOOKED_CONFERENCE + PRE_BOOKED_CONFERENCE * 0.1,
          paidByTakerSpecialWithoutGst: PRE_BOOKED_CONFERENCE,
          lfhCommissionGeneral: PRE_BOOKED_CONFERENCE * 0.3,
          lfhCommissionSpecial: (PRE_BOOKED_CONFERENCE + PRE_BOOKED_CONFERENCE * 0.1) * 0.3,
          paidToInterpreterGeneralWithGst: PRE_BOOKED_CONFERENCE * 0.7,
          paidToInterpreterGeneralWithoutGst: ((PRE_BOOKED_CONFERENCE * 0.7) / 11) * 10,
          paidToInterpreterSpecialWithGst: (PRE_BOOKED_CONFERENCE + PRE_BOOKED_CONFERENCE * 0.1) * 0.7,
          paidToInterpreterSpecialWithoutGst: (((PRE_BOOKED_CONFERENCE + PRE_BOOKED_CONFERENCE * 0.1) * 0.7) / 11) * 10,
        },
        {
          interpreterType: EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
          quantity: currentQuantity++,
          schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
          communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
          interpretingType: EAppointmentInterpretingType.ESCORT,
          qualifier: ERateQualifier.WORKING_DAY,
          details: ERateTiming.CALCULATED_PER_DAY_8_HOURS,
          detailsSequence: ERateDetailsSequence.ALL_DAY,
          detailsTime: ERateDetailsTime.EIGHT_HOURS,
          normalHoursStart: STANDARD_RATE_HOUR_START,
          normalHoursEnd: STANDARD_RATE_HOUR_END,
          paidByTakerGeneralWithGst: PRE_BOOKED_ESCORT,
          paidByTakerGeneralWithoutGst: (PRE_BOOKED_ESCORT / 11) * 10,
          paidByTakerSpecialWithGst: PRE_BOOKED_ESCORT + PRE_BOOKED_ESCORT * 0.1,
          paidByTakerSpecialWithoutGst: PRE_BOOKED_ESCORT,
          lfhCommissionGeneral: PRE_BOOKED_ESCORT * 0.3,
          lfhCommissionSpecial: (PRE_BOOKED_ESCORT + PRE_BOOKED_ESCORT * 0.1) * 0.3,
          paidToInterpreterGeneralWithGst: PRE_BOOKED_ESCORT * 0.7,
          paidToInterpreterGeneralWithoutGst: ((PRE_BOOKED_ESCORT * 0.7) / 11) * 10,
          paidToInterpreterSpecialWithGst: (PRE_BOOKED_ESCORT + PRE_BOOKED_ESCORT * 0.1) * 0.7,
          paidToInterpreterSpecialWithoutGst: (((PRE_BOOKED_ESCORT + PRE_BOOKED_ESCORT * 0.1) * 0.7) / 11) * 10,
        },
      );
    }

    for (const appointmentType of appointmentTypes) {
      appointmentType.paidByTakerGeneralWithGst = round2(appointmentType.paidByTakerGeneralWithGst);
      appointmentType.paidByTakerGeneralWithoutGst = round2(appointmentType.paidByTakerGeneralWithoutGst);
      appointmentType.paidByTakerSpecialWithGst = round2Nullable(appointmentType.paidByTakerSpecialWithGst);
      appointmentType.paidByTakerSpecialWithoutGst = round2Nullable(appointmentType.paidByTakerSpecialWithoutGst);
      appointmentType.lfhCommissionGeneral = round2(appointmentType.lfhCommissionGeneral);
      appointmentType.lfhCommissionSpecial = round2Nullable(appointmentType.lfhCommissionSpecial);
      appointmentType.paidToInterpreterGeneralWithGst = round2(appointmentType.paidToInterpreterGeneralWithGst);
      appointmentType.paidToInterpreterGeneralWithoutGst = round2(appointmentType.paidToInterpreterGeneralWithoutGst);
      appointmentType.paidToInterpreterSpecialWithGst = round2Nullable(appointmentType.paidToInterpreterSpecialWithGst);
      appointmentType.paidToInterpreterSpecialWithoutGst = round2Nullable(
        appointmentType.paidToInterpreterSpecialWithoutGst,
      );
    }

    return appointmentTypes;
  }
}
