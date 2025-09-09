export interface IJwtPayload {
  email: string;
  userId: string;
  userRole: string;
  userRoleId: string;
  clientUserAgent: string;
  clientIPAddress: string;
  iat: number;
  exp: number;
}
