import { allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const promoCampaigns: IMethodSeed = {
  "GET /v1/promo-campaigns": {
    description: "01. Get all promo campaigns",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/promo-campaigns/special": {
    description: "02. Get special promo campaigns",
    roles: {
      ...allLfhAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/promo-campaigns/:id": {
    description: "03. Get promo campaign by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/promo-campaigns/personal": {
    description: "04. Create personal promo campaign",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/promo-campaigns/corporate": {
    description: "05. Create corporate promo campaign",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/promo-campaigns/upload-banner": {
    description: "06. Upload promo campaign banner",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/promo-campaigns/:id": {
    description: "07. Update corporate promo campaign",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/promo-campaigns/assign": {
    description: "08. Assign promo campaign",
    roles: {
      ...allLfhAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/promo-campaigns/unassign": {
    description: "09. Unassign promo campaign",
    roles: {
      ...allLfhAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
