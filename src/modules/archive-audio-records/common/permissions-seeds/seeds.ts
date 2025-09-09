import { allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const archiveAudioRecords: IMethodSeed = {
  "GET /v1/archive-audio-records/:id": {
    description: "01.01. Get audio recording by appointment admin info id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
