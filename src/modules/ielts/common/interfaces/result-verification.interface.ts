export interface IResultVerification {
  messageMetadata: {
    messageRequestUid: string;
    messageOriginator: string;
    messageRequestDateTime: string;
    previousResultSetUrl: string;
    currentResultSetUrl: string;
    nextResultSetUrl: string;
    QueryResultSet: [];
  };
  results: {
    roName: string;
    roId: string;
    candidateId: string;
    idType: string;
    centreNumber: string;
    candidateNumber: string;
    testDate: string;
    module: string;
    familyName: string;
    firstName: string;
    dateOfBirth: string;
    gender: string;
    listeningScore: string;
    readingScore: string;
    writingScore: string;
    speakingScore: string;
    overallBandScore: string;
    trfNumber: string;
    telephone: string;
    postalAddress: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    addressLine4: string;
    region: string;
    town: string;
    postCode: string;
    country: string;
    countryCode: string;
    candidateEmail: string;
    photo: { data: string };
    photoMediaType: string;
    status: string;
    lastModifiedDate: string;
  }[];
  resultSummary: { recordCount: number };
}
