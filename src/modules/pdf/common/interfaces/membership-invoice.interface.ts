import { EMembershipType } from "src/modules/memberships/common/enums";

export interface IMembershipInvoice {
  clientName: string;
  clientAddress: string;
  clientSuburb: string;
  clientState: string;
  clientPostcode: string;
  invoiceDate: string;
  clientId: string;
  membershipType: EMembershipType;
  valueExclGST: string;
  valueGST: string;
  total: string;
}

export interface IMembershipInvoiceWithKey {
  receiptKey: string;
  receiptData: IMembershipInvoice;
}
