import { Exclude } from "class-transformer";

export class UserAddressOutput {
  @Exclude()
  id: string;

  @Exclude()
  organizationName: string;

  @Exclude()
  notes: string;

  @Exclude()
  city: string;
}
