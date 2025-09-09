import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const users: IMethodSeed = {
  "GET /v1/users/me": {
    description: "01.01. Get current user",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/me/change-registered-phone": {
    description: "01.02. Change registered phone",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/users/me/verify-new-phone": {
    description: "01.03. Verify new phone",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/me/change-registered-email": {
    description: "01.04. Change registered email",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/users/me/verify-new-email": {
    description: "01.05. Verify new email",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/users/me/change-registered-password": {
    description: "01.06. Change registered password",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/profile-information": {
    description: "03.01. Create profile",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/users/profile-information": {
    description: "03.02. Get profile information",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/users/profile-information": {
    description: "03.03. Edit profile information",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/password-reset-requests": {
    description: "05.01. Password reset requests",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/password-reset-requests/verification": {
    description: "05.02. Password reset requests verification",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/users/password": {
    description: "05.03. Change password",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
