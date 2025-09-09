import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const paymentInformation: IMethodSeed = {
  "POST /v1/payment-information/individual/create-stripe-customer-for-pay-in": {
    description: "01.01. Create stripe customer for individual client",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/individual/attach-card-to-stripe-for-pay-in": {
    description: "01.02. Attach card to stripe customer for client",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/individual/remove-stripe-for-pay-in": {
    description: "01.03. Remove stripe customer for client",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/individual/create-stripe-account-for-pay-out": {
    description: "02.01. Create stripe account for interpreter",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/individual/create-stripe-login-link-for-pay-out": {
    description: "02.02. Create stripe login link for interpreter",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/individual/remove-stripe-for-pay-out": {
    description: "02.03. Remove stripe for interpreter",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/individual/create-paypal-for-pay-out": {
    description: "03.01. Add paypal account for interpreter",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/individual/remove-paypal-for-pay-out": {
    description: "03.02. Remove paypal for interpreter",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/corporate/create-stripe-customer-for-pay-in": {
    description: "04.01. Create stripe customer for corporate client",
    roles: {
      "corporate-clients-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/corporate/attach-bank-account-to-stripe-for-pay-in": {
    description: "04.02. Attach bank account to stripe customer for corporate client",
    roles: {
      "corporate-clients-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/corporate/remove-stripe-for-pay-in": {
    description: "04.03. Remove stripe customer for corporate client",
    roles: {
      "corporate-clients-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/corporate/create-stripe-account-for-pay-out": {
    description: "05.01. Create stripe account for corporate interpreter",
    roles: {
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/corporate/create-stripe-login-link-for-pay-out": {
    description: "05.02. Create stripe login link for corporate interpreter",
    roles: {
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/corporate/remove-stripe-for-pay-out": {
    description: "05.03. Remove stripe for corporate interpreter",
    roles: {
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/corporate/create-paypal-for-pay-out": {
    description: "06.01. Add paypal account for corporate interpreter",
    roles: {
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/payment-information/corporate/remove-paypal-for-pay-out": {
    description: "06.02. Remove paypal for corporate interpreter",
    roles: {
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/payment-information/set-default-payment-method": {
    description: "07.01. Change default payment method (stripe/paypal)",
    roles: {
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
  "GET /v1/payment-information/get-payment-info": {
    description: "07.02. Returned payment information of client/interpreter",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-clients-receptionist": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-receptionist": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
