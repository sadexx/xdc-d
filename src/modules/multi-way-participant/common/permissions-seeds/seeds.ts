import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allAdminRoles } from "src/modules/permissions/common/constants";

export const multiWayParticipants: IMethodSeed = {
  "POST /v1/multi-way-participants/appointment/add-participant/:id": {
    description: "01.01. Add participant to appointment",
    roles: {
      ...allAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/multi-way-participants/:id": {
    description: "01.02. Update participant",
    roles: {
      ...allAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/multi-way-participants/:id": {
    description: "01.03. Delete participant",
    roles: {
      ...allAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
