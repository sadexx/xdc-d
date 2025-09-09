import { Injectable } from "@nestjs/common";
import * as path from "path";
import { PassThrough } from "node:stream";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import PdfPrinter from "pdfmake";
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const pdfMake = require("pdfmake");

@Injectable()
export class PdfService {
  public async generatePdf(docDefinition: TDocumentDefinitions): Promise<PassThrough> {
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
}
