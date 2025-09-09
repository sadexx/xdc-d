import { ICurrentUserData } from "src/modules/users/common/interfaces";

export type IInvitedCurrentUserDataOutput = Omit<ICurrentUserData, "clientUserAgent" | "clientIPAddress">;
