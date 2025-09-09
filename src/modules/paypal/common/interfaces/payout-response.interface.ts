export interface IPayoutResponse {
  batch_header: {
    payout_batch_id: string; // "HELE23YS44U9C"
    batch_status: string; // "PENDING"
    sender_batch_header: { email_subject: string }; // "Test Payment"
  };
  links: [
    {
      href: string; // "https://api.sandbox.paypal.com/v1/payments/payouts/HELE23YS44U9C"
      rel: string; // "self"
      method: string; // "GET"
      encType: string; // "application/json"
    },
  ];
}
