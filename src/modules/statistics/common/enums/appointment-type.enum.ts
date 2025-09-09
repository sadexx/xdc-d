import { ValuesOf } from "src/common/types";

export const EAppointmentType = {
  ALL: "all",
  AUDIO_ON_DEMAND: "audio-on-demand",
  VIDEO_ON_DEMAND: "video-on-demand",
  F2F_ON_DEMAND: "f2f-on-demand",
  AUDIO_PRE_BOOKED: "audio-pre-booked",
  VIDEO_PRE_BOOKED: "video-pre-booked",
  F2F_PRE_BOOKED: "f2f-pre-booked",
} as const;

export type EAppointmentType = ValuesOf<typeof EAppointmentType>;
