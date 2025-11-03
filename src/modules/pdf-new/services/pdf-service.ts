import { Injectable } from "@nestjs/common";
import * as path from "path";
import { PassThrough } from "node:stream";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import PdfPrinter from "pdfmake";
import { PdfBuilderService, PdfTemplatesService } from "src/modules/pdf-new/services";
import {
  IGenerateCorporatePayOutReceipt,
  IGenerateCorporateTaxInvoiceReceipt,
  IGenerateInterpreterBadge,
  IGenerateMembershipInvoice,
  IGeneratePayInReceipt,
  IGeneratePayOutReceipt,
  IGenerateTaxInvoiceReceipt,
} from "src/modules/pdf-new/common/interfaces";
import { randomUUID } from "node:crypto";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { ConfigService } from "@nestjs/config";
import { EmailsService } from "src/modules/emails/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments-new/entities";
import { In, Repository } from "typeorm";
import { IS_MEDIA_BUCKET } from "src/common/constants";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { TWebhookPaymentIntentSucceededPayment } from "src/modules/webhook-processor/common/types";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake");

@Injectable()
export class PdfService {
  private readonly BACK_END_URL: string;

  private readonly fonts = {
    Roboto: {
      normal: path.resolve(__dirname, "../common/fonts/roboto/Roboto-Regular.ttf"),
      bold: path.resolve(__dirname, "../common/fonts/roboto/Roboto-Bold.ttf"),
      italics: path.resolve(__dirname, "../common/fonts/roboto/Roboto-Italic.ttf"),
      bolditalics: path.resolve(__dirname, "../common/fonts/roboto/Roboto-BoldItalic.ttf"),
    },
    OpenSans: {
      light: path.resolve(__dirname, "../common/fonts/open-sans/OpenSans-Light.ttf"),
      normal: path.resolve(__dirname, "../common/fonts/open-sans/OpenSans-Regular.ttf"),
      medium: path.resolve(__dirname, "../common/fonts/open-sans/OpenSans-Medium.ttf"),
      bold: path.resolve(__dirname, "../common/fonts/open-sans/OpenSans-Bold.ttf"),
      extraBold: path.resolve(__dirname, "../common/fonts/open-sans/OpenSans-ExtraBold.ttf"),
    },
  };

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    private readonly configService: ConfigService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly pdfTemplatesService: PdfTemplatesService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  private async generatePdf(docDefinition: TDocumentDefinitions): Promise<PassThrough> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const printer = new pdfMake(this.fonts) as PdfPrinter;

    const pdfStream = new PassThrough();

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    pdfDoc.pipe(pdfStream);
    pdfDoc.end();

    return pdfStream;
  }

  public async generatePayInReceipt(data: IGeneratePayInReceipt): Promise<void> {
    const { appointment, payment } = data;

    const receiptData = await this.pdfBuilderService.buildPayInReceiptData(data);

    const docDefinition = this.pdfTemplatesService.payInReceiptTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    await this.paymentRepository.update(payment.id, { receipt: receiptKey });

    const emailRecipient = payment.company ? payment.company.contactEmail : appointment.client.profile.contactEmail;
    await this.emailsService.sendIncomingPaymentReceipt(emailRecipient, receiptLink, receiptData);
  }

  public async generatePayOutReceipt(data: IGeneratePayOutReceipt): Promise<void> {
    const { paymentRecordResult, interpreter } = data;
    const { payment } = paymentRecordResult;

    const receiptData = await this.pdfBuilderService.buildPayOutReceiptData(data);

    const docDefinition = this.pdfTemplatesService.payoutReceiptTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    await this.paymentRepository.update(payment.id, { receipt: receiptKey });

    await this.emailsService.sendOutgoingPaymentReceipt(interpreter.profile.contactEmail, receiptLink, receiptData);
  }

  public async generateTaxInvoiceReceipt(data: IGenerateTaxInvoiceReceipt): Promise<void> {
    const { paymentRecordResult, interpreter } = data;
    const { payment } = paymentRecordResult;

    const receiptData = await this.pdfBuilderService.buildTaxInvoiceReceiptData(data);

    const docDefinition = this.pdfTemplatesService.taxInvoiceTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const taxInvoiceLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    await this.paymentRepository.update(payment.id, { taxInvoice: receiptKey });

    await this.emailsService.sendTaxInvoicePaymentReceipt(
      interpreter.profile.contactEmail,
      taxInvoiceLink,
      receiptData,
    );
  }

  public async generateMembershipInvoice(data: IGenerateMembershipInvoice): Promise<void> {
    const { userRole, membershipType } = data;

    const receiptData = await this.pdfBuilderService.buildMembershipInvoiceData(data);

    const docDefinition = this.pdfTemplatesService.membershipInvoiceTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    await this.emailsService.sendMembershipPaymentSucceededEmail(
      userRole.profile.contactEmail,
      userRole.profile.preferredName || userRole.profile.firstName,
      membershipType,
      receiptLink,
    );
  }

  public async generateInterpreterBadge(data: IGenerateInterpreterBadge): Promise<void> {
    const { userRole } = data;

    const receiptData = await this.pdfBuilderService.buildInterpreterBadgeData(data);

    const docDefinition = await this.pdfTemplatesService.interpreterBadgeTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const badgeKey = `users/interpreter-badges/${userRole.id}.pdf`;
    const badgeLink = this.awsS3Service.getMediaObjectUrl(badgeKey);

    await this.awsS3Service.uploadObject(badgeKey, pdfStream, "application/pdf", IS_MEDIA_BUCKET);

    await this.interpreterProfileRepository.update(
      { userRole: { id: userRole.id } },
      { interpreterBadgePdf: badgeLink },
    );
  }

  public async generateDepositCharge(payment: TWebhookPaymentIntentSucceededPayment): Promise<void> {
    const { company } = payment;

    const receiptData = await this.pdfBuilderService.buildDepositChargeReceiptData(payment);

    const docDefinition = this.pdfTemplatesService.depositChargeReceiptTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    await this.paymentRepository.update({ id: payment.id }, { receipt: receiptKey });

    await this.emailsService.sendDepositChargeReceipt(company.contactEmail, receiptLink, receiptData);
  }

  public async generateCorporatePayOutReceipt(data: IGenerateCorporatePayOutReceipt): Promise<void> {
    const { payments, company } = data;

    const receiptData = await this.pdfBuilderService.buildCorporatePayOutReceipt(data);

    const docDefinition = this.pdfTemplatesService.payoutCorporateReceiptTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    const paymentIds = payments.map((payment) => payment.id);
    await this.paymentRepository.update({ id: In(paymentIds) }, { receipt: receiptKey });

    await this.emailsService.sendOutgoingCorporatePaymentReceipt(company.contactEmail, receiptLink, receiptData);
  }

  public async generateCorporateTaxInvoiceReceipt(data: IGenerateCorporateTaxInvoiceReceipt): Promise<void> {
    const { payments, company } = data;

    const receiptData = await this.pdfBuilderService.buildCorporateTaxInvoiceReceipt(data);

    const docDefinition = this.pdfTemplatesService.taxInvoiceCorporateTemplate(receiptData);

    const pdfStream = await this.generatePdf(docDefinition);

    const receiptKey = `payments/lfh-receipts/${randomUUID()}.pdf`;
    const receiptLink = `${this.BACK_END_URL}/v1/payments/download-receipt?receiptKey=${receiptKey}`;

    await this.awsS3Service.uploadObject(receiptKey, pdfStream, "application/pdf");

    const paymentIds = payments.map((payment) => payment.id);

    await this.paymentRepository.update({ id: In(paymentIds) }, { taxInvoice: receiptKey });

    await this.emailsService.sendTaxInvoiceCorporatePaymentReceipt(company.contactEmail, receiptLink, receiptData);
  }
}
