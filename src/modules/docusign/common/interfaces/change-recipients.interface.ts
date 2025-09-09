export interface IChangeRecipientsInterface {
  recipientUpdateResults: {
    recipientId: string;
    errorDetails: {
      errorCode: string;
      message: string;
    };
  }[];
}
