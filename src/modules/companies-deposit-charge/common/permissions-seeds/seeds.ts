import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const companiesDepositCharge: IMethodSeed = {
  "POST /v1/companies-deposit-charge/create-request": {
    description: "01.01. Create request to charge company deposit",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
