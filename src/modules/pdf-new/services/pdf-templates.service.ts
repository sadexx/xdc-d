/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import { IPayInReceipt } from "src/modules/pdf-new/common/interfaces";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { LFH_LOGO_LABELLED, LFH_LOGO_LIGHT } from "src/modules/pdf-new/common/constants";

@Injectable()
export class PdfTemplatesService {
  public payInReceiptTemplate(data: IPayInReceipt): TDocumentDefinitions {
    const { lfhCompanyData, recipientData, appointment, payment, discountSummary } = data;
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: [
                { text: "WE MAKE IT CLEAR/ ", style: "header" },
                { text: "INTERPRETING 24/7", style: ["header", "redText"] },
              ],
            },
            {
              image: LFH_LOGO_LIGHT,
              width: 60,
            },
          ],
        },
        {
          columns: [{ text: " ", style: { lineHeight: 2 } }],
        },
        {
          columns: [
            {
              image: LFH_LOGO_LABELLED,
              width: 100,
            },
            {
              alignment: "right",
              stack: [
                { text: `TAX INVOICE`, fontSize: 20 },
                { text: " " },
                { text: `From ${lfhCompanyData.companyName}`, bold: true },
                { text: `ABN ${lfhCompanyData.abnNumber})` },
                { text: lfhCompanyData.companyAddress },
                { text: " " },
                { text: `To ${recipientData.recipientName}`, bold: true },
                { text: `(Client ID ${recipientData.recipientId})`, bold: true },
                { text: recipientData.recipientAddress },
              ],
            },
          ],
          margin: [0, 10, 0, 20],
        },
        { text: `Invoice Number ${appointment.platformId} - PAID`, style: "subheader", margin: [0, 10, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: [65, 65, 65, 65, 65, 65, 65],
            body: [
              [
                { text: "Currency", style: "tableHeader" },
                { text: "Date of Issue", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
                { text: "GST Amount", style: "tableHeader" },
                { text: "Invoice Total", style: "tableHeader" },
                { text: "Amount Paid", style: "tableHeader" },
                { text: "Amount Due", style: "tableHeader" },
              ],
              [
                payment.currency,
                data.issueDate,
                `${payment.currency} ${payment.totalAmount}`,
                `${payment.currency} ${payment.totalGstAmount}`,
                `${payment.currency} ${payment.totalFullAmount}`,
                `${payment.currency} ${payment.totalFullAmount ? -payment.totalFullAmount : 0}`,
                `${payment.currency} ${"0.00"}`,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        { text: "Payment", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: [80, 242, 80, 80],
            body: [
              [
                { text: "Date", style: "tableHeader" },
                { text: "Description", style: "tableHeader" },
                { text: "Payment Total", style: "tableHeader" },
                { text: "This Invoice", style: "tableHeader" },
              ],
              [
                data.issueDate,
                recipientData.description,
                `${payment.currency} ${payment.totalFullAmount ? -payment.totalFullAmount : 0}`,
                `${payment.currency} ${payment.totalFullAmount}`,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        { text: "Details", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: [55, 85, 65, 85, 65, 55, 45],
            body: [
              [
                { text: "Booking ID", style: "tableHeader" },
                { text: "Service", style: "tableHeader" },
                { text: "Topic", style: "tableHeader" },
                { text: "Date & Time", style: "tableHeader" },
                { text: "Interpreter ID", style: "tableHeader" },
                { text: "Duration in minutes", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
              ],
              [
                appointment.platformId,
                data.appointmentServiceType,
                appointment.topic,
                data.appointmentDate,
                data.interpreter,
                data.totalDuration,
                `${payment.currency} ${payment.totalFullAmount}`,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        { text: "Discount Applied (Memberships, Promo codes)", style: "subheader" },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: [142, 113, 113, 113],
            body: [
              [
                { text: "Discount Type (Membership/Promo code)", style: "tableHeader" },
                { text: "Discount ID", style: "tableHeader" },
                { text: "Discount applied", style: "tableHeader" },
                { text: "Discount amount", style: "tableHeader" },
              ],
              ["Estimated Cost", "", "", `${payment.currency} ${payment.estimatedCostAmount}`],
              ["Actual time", "", "", `${payment.currency} ${payment.totalAmount}`],
              [
                "Promo Code",
                discountSummary?.discountRate.promoCode ?? "",
                discountSummary?.promoCodeDiscountDescription ?? "",
                `${payment.currency} ${discountSummary?.appliedDiscounts.promoCampaignDiscount ?? 0}`,
              ],
              [
                "Mixed Promo code",
                discountSummary?.discountRate.promoCode ?? "",
                discountSummary?.mixedPromoCodeDescription ?? "",
                `${payment.currency} ${discountSummary?.appliedDiscounts.promoCampaignDiscount ?? 0}`,
              ],
              [
                "Membership",
                discountSummary?.membershipDescription ?? "",
                discountSummary?.membershipDiscountDescription ?? "",
                `${payment.currency} ${discountSummary?.appliedDiscounts.membershipDiscount ?? 0}`,
              ],
              ["Sub-total", "", "", `${payment.currency} ${payment.totalAmount}`],
              ["GST", "", "", `${payment.currency} ${payment.totalGstAmount}`],
              ["Total cost", "", "", `${payment.currency} ${payment.totalFullAmount}`],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@lighuafrancahub.com", link: "mailto:payments@lighuafrancahub.com", color: "blue" },
            { text: "© 2025 Lingua Franca Hub. All rights reserved" },
          ],
          style: "footer",
        },
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        redText: { color: "red" },
        subheader: { fontSize: 12, bold: true, margin: [0, 10, 0, 10] },
        tableHeader: { bold: true, fontSize: 10, color: "black", fillColor: "#EFF9FE" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
    };

    return docDefinition;
  }
}
