export interface IGetDocumentsInterface {
  envelopeId: string;
  envelopeDocuments: {
    documentId: string;
    name: string;
    type: string;
    uri: string;
    order: string;
    pages: string;
    availableDocumentTypes: { type: string; isDefault: string }[];
    display: string;
    includeInDownload: string;
    signerMustAcknowledge: string;
    authoritativeCopy: string;
  }[];
}
