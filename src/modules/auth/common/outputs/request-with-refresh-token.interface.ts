import { Request } from "express";

export interface IRequestWithRefreshTokenOutput extends Request {
  cookies: {
    refreshToken?: string;
  };
  body: {
    refreshToken?: string;
  };
}
