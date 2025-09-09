import { Exclude } from "class-transformer";

export class UserProfileInfoOutput {
  @Exclude()
  id: string;
}
