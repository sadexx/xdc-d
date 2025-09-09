import { Exclude, Expose, plainToInstance, Transform } from "class-transformer";
import { UserRole } from "src/modules/users/entities";
import { UserAddressOutput, UserProfileInfoOutput } from "src/modules/users/common/outputs";
import { DiscountHolderOutput } from "src/modules/discounts/common/outputs";

export class UserProfileOutput {
  @Exclude()
  password: string;

  @Exclude()
  isEmailVerified: boolean;

  @Exclude()
  userRoles: UserRole[];

  @Exclude()
  currentUserRole: UserRole;

  @Expose()
  @Transform(({ obj }) => plainToInstance(UserAddressOutput, obj.currentUserRole.address), { toClassOnly: true })
  residentialAddress?: UserAddressOutput;

  @Expose()
  @Transform(({ obj }) => plainToInstance(UserProfileInfoOutput, obj.currentUserRole.profile), { toClassOnly: true })
  profileInformation?: UserProfileInfoOutput;

  @Expose()
  @Transform(({ obj }) => plainToInstance(DiscountHolderOutput, obj.currentUserRole.discountHolder), {
    toClassOnly: true,
  })
  discountHolder?: DiscountHolderOutput;
}
