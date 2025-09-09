export interface IProfileInformationResponse {
  user_id: "string";
  sub: "string";
  name?: "string";
  email?: "string";
  email_verified?: boolean;
  verified_account?: string;
  verified?: string;
  payer_id?: string;
}
