export interface IPayoutResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: { email_subject: string };
  };
  links: [
    {
      href: string;
      rel: string;
      method: string;
      encType: string;
    },
  ];
}
