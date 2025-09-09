import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allLfhAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const contactForm: IMethodSeed = {
  "POST /v1/contact-forms": {
    description: "01. Create contact form",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/contact-forms": {
    description: "02. Get contact forms",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/contact-forms/set-viewed/:id": {
    description: "03. Set viewed contact form.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
