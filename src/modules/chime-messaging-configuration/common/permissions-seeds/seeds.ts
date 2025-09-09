import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import {
  allAdminRoles,
  allLfhAdminRoles,
  allRolesAllowedAndNotEditable,
} from "src/modules/permissions/common/constants";

export const chimeMessagingConfiguration: IMethodSeed = {
  "GET /v1/chime/channels/messages": {
    description: "01. Get channel messages",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/endpoint": {
    description: "02. Get session endpoint",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/admin": {
    description: "03. Get admin channels",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/appointments": {
    description: "04. Get appointment channels",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/user": {
    description: "05. Get user channels",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/:id": {
    description: "06. Get channel by id",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/chime/channels/appointment-information/:id": {
    description: "07. Get channel appointment information",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/channels": {
    description: "08. Create channel",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/channels/join/:id": {
    description: "09. Join channel",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/chime/channels/file-upload": {
    description: "10. Upload file to channel",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/chime/channels/resolve/:id": {
    description: "11. Update channel status",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
