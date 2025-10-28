import { Injectable } from "@nestjs/common";
import * as path from "path";
import { PassThrough } from "node:stream";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import PdfPrinter from "pdfmake";
import { PdfBuilderService, PdfTemplatesService } from "src/modules/pdf-new/services";
import { IGeneratePayInReceipt } from "src/modules/pdf-new/common/interfaces";
import { randomUUID } from "node:crypto";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { ConfigService } from "@nestjs/config";
import { EmailsService } from "src/modules/emails/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments-new/entities";
import { Repository } from "typeorm";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake");

@Injectable()
export class PdfService {
  private readonly BACK_END_URL: string;
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly pdfBuilderService: PdfBuilderService,
    private readonly pdfTemplatesService: PdfTemplatesService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  private async generatePdf(docDefinition: TDocumentDefinitions): Promise<PassThrough> {
    const fonts = {
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const printer = new pdfMake(fonts) as PdfPrinter;

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

    await this.emailsService.sendIncomingPaymentReceipt(
      appointment.client.profile.contactEmail,
      receiptLink,
      receiptData,
    );
  }
}
