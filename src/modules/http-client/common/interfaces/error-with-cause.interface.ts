export interface ErrorWithCause extends Error {
  cause?: NetworkErrorDetails | Error;
}

interface NetworkErrorDetails {
  code: string;
  syscall: string;
  address: string;
  port: number;
  errno: number;
}
