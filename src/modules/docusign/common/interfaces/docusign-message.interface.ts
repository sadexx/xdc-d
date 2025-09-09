/* eslint-disable @typescript-eslint/no-explicit-any */
import { EExtDocusignEvent, EExtDocusignStatus } from "src/modules/docusign/common/enums";

export interface IDocusignMessageInterface {
  event: EExtDocusignEvent;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: number;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary: {
      status: EExtDocusignStatus;
      documentsUri: string;
      recipientsUri: string;
      attachmentsUri: string;
      envelopeUri: string;
      emailSubject: string;
      envelopeId: string;
      signingLocation: string;
      customFieldsUri: string;
      notificationUri: string;
      enableWetSign: string;
      allowMarkup: string;
      allowReassign: string;
      createdDateTime: string;
      lastModifiedDateTime: string;
      deliveredDateTime: string;
      initialSentDateTime: string;
      sentDateTime: string;
      completedDateTime: string;
      statusChangedDateTime: string;
      documentsCombinedUri: string;
      certificateUri: string;
      templatesUri: string;
      expireEnabled: string;
      expireDateTime: string;
      expireAfter: string;
      sender: {
        userName: string;
        userId: string;
        accountId: string;
        email: string;
        ipAddress: string;
      };
      folders: {
        name: string;
        type: string;
        owner: {
          userId: string;
          email: string;
        };
        folderId: string;
        uri: string;
      }[];
      customFields: {
        textCustomFields: {
          fieldId: string;
          name: string;
          show: boolean;
          required: boolean;
          value: string;
        }[];
        listCustomFields: {
          fieldId: string;
          name: string;
          show: boolean;
          required: boolean;
          value: string;
        }[];
      };
      recipients: {
        signers: {
          tabs: {
            signHereTabs: {
              stampType: string;
              name: string;
              tabLabel: string;
              scaleValue: string;
              optional: string;
              documentId: string;
              recipientId: string;
              pageNumber: string;
              xPosition: string;
              yPosition: string;
              tabId: string;
              templateRequired: string;
              status: string;
              tabType: string;
            }[];
          };
          creationReason: string;
          isBulkRecipient: string;
          requireUploadSignature: string;
          name: string;
          email: string;
          recipientId: string;
          recipientIdGuid: string;
          requireIdLookup: string;
          userId: string;
          routingOrder: string;
          note: string;
          roleName: string;
          status: string;
          completedCount: string;
          signedDateTime: string;
          deliveredDateTime: string;
          sentDateTime: string;
          deliveryMethod: string;
          totalTabCount: string;
          recipientType: string;
        }[];
        agents: any[];
        editors: any[];
        intermediaries: any[];
        carbonCopies: any[];
        certifiedDeliveries: any[];
        inPersonSigners: any[];
        seals: any[];
        witnesses: any[];
        notaries: any[];
        recipientCount: string;
        currentRoutingOrder: string;
      };
      envelopeDocuments: {
        documentId: string;
        documentIdGuid: string;
        name: string;
        type: string;
        uri: string;
        order: string;
        pages?: {
          pageId: string;
          sequence: string;
          height: string;
          width: string;
          dpi: string;
        }[];
        display: string;
        includeInDownload: string;
        signerMustAcknowledge: string;
        templateRequired: string;
        authoritativeCopy: string;
      }[];
      purgeState: string;
      envelopeIdStamping: string;
      is21CFRPart11: string;
      signerCanSignOnMobile: string;
      autoNavigation: string;
      isSignatureProviderEnvelope: string;
      hasFormDataChanged: string;
      allowComments: string;
      hasComments: string;
      allowViewHistory: string;
      envelopeMetadata: {
        allowAdvancedCorrect: string;
        enableSignWithNotary: string;
        allowCorrect: string;
      };
      anySigner: null;
      envelopeLocation: string;
      isDynamicEnvelope: string;
      burnDefaultTabData: string;
    };
  };
}
