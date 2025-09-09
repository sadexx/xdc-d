import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import {
  allAdminRoles,
  allClientRolesNotEditable,
  allLfhAdminRoles,
  allRolesAllowedAndNotEditable,
} from "src/modules/permissions/common/constants";

export const chimeMeetingConfiguration: IMethodSeed = {
  "GET /v1/chime/meetings/info-config/:appointmentId": {
    description: "01. Get config and attendees by appointment id",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/join-admin/:appointmentId": {
    description: "02. Join to meeting as super-admin",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/join/:appointmentId": {
    description: "03. Join to meeting as internal user",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/join-external/:appointmentId": {
    description: "04. Join to meeting as external user",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/meetings/:chimeMeetingId/attendees/:attendeeId": {
    description: "05. Get attendee and details",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/chime/meetings/batch-update-attendees-capabilities/:chimeMeetingId": {
    description: "06. Update all attendee capabilities as super-admin",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/chime/meetings/update-attendee-capabilities/:chimeMeetingId": {
    description: "07. Update attendee capabilities",
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
  "DELETE /v1/chime/meetings/:chimeMeetingId/attendees/:attendeeId": {
    description: "08. Disable attendee in meeting",
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
  "POST /v1/chime/meetings/add-extra-attendee/:chimeMeetingId": {
    description: "09. Add extra attendee in live meeting",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/receptionist-call/:chimeMeetingId": {
    description: "10. Receptionist call",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/background-calls/:chimeMeetingId": {
    description: "11. Background calls to client or interpreter or external participants",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/clients-call-for-any-external-participants/:chimeMeetingId": {
    description: "12. Background call for any external participants",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/leave/:id/:attendeeId": {
    description: "13. Leave meeting",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/meetings/close/:chimeMeetingId": {
    description: "14. Close meeting",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
