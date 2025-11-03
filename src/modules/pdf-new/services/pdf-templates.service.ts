/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import {
  ICorporatePayOutReceipt,
  ICorporateTaxInvoiceReceipt,
  IDepositChargeReceipt,
  IInterpreterBadge,
  IMembershipInvoice,
  IPayInReceipt,
  IPayOutReceipt,
  ITaxInvoiceReceipt,
} from "src/modules/pdf-new/common/interfaces";
import { Alignment, Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { LFH_LOGO_LABELLED, LFH_LOGO_LIGHT, RATING_STAR } from "src/modules/pdf-new/common/constants";
import { PdfBase64ImageConverterService } from "src/modules/pdf-new/services";

@Injectable()
export class PdfTemplatesService {
  constructor(private readonly pdfBase64ImageConverterService: PdfBase64ImageConverterService) {}

  public payInReceiptTemplate(data: IPayInReceipt): TDocumentDefinitions {
    const {
      lfhCompanyData,
      recipientData,
      appointment,
      payment,
      discountSummary,
      issueDate,
      interpreter,
      appointmentDate,
      appointmentServiceType,
      totalDuration,
    } = data;
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
                issueDate,
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
                issueDate,
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
                appointmentServiceType,
                appointment.topic,
                appointmentDate,
                interpreter,
                totalDuration,
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

  public payoutReceiptTemplate(data: IPayOutReceipt): TDocumentDefinitions {
    const {
      appointment,
      recipientData,
      interpreter,
      payment,
      issueDate,
      totalDuration,
      appointmentServiceType,
      appointmentDate,
    } = data;
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
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 175,
            },
            {
              stack: [
                { text: "REMITTANCE ADVICE", fontSize: 25, bold: true, alignment: "right" },
                { text: `Invoice # ${appointment.platformId}`, fontSize: 14, alignment: "right" },
                { text: "From: Lingua Franca Hub PTY LTD", fontSize: 14, bold: true, alignment: "right" },
                { text: "ABN 42 661 208 635", fontSize: 14, alignment: "right" },
                {
                  text: "36/1 Thread Lane, Waterloo, NSW, 2017, Australia",
                  fontSize: 14,
                  alignment: "right",
                },
                { text: `To: ${recipientData.recipientName}`, fontSize: 14, bold: true, alignment: "right" },
                { text: `(Interpreter ID ${interpreter.user.platformId})`, fontSize: 14, alignment: "right" },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          stack: [
            { text: `Hi, ${interpreter.profile.firstName},`, margin: [0, 10] },
            {
              text: `I am attaching your remittance advice for payment.`,
            },
            {
              text: "If you have any questions or need further assistance, feel free to reach out to us at",
              margin: [0, 10],
            },
            { text: "interpreters@linguafrancahub.com", margin: [0, 10] },
            { text: "Best regards,", margin: [0, 10] },
            { text: "LFH Customer Support Team", margin: [0, 10] },
          ],
        },

        {
          table: {
            headerRows: 1,
            widths: ["18%", "26%", "20%", "18%", "18%"],
            body: [
              [
                { text: "Payment Date", style: "tableHeader" },
                { text: "Booking ID", style: "tableHeader" },
                { text: "Booking Type", style: "tableHeader" },
                { text: "Chargeable mins", style: "tableHeader" },
                { text: "Total Amount Paid", style: "tableHeader" },
              ],
              [
                `${issueDate}`,
                `#${appointment.platformId}`,
                `${appointmentServiceType}`,
                `${totalDuration}`,
                `${payment.currency} ${payment.totalFullAmount}`,
              ],
            ],
          },
          margin: [0, 10, 0, 0],
        },
        {
          table: {
            headerRows: 1,
            widths: ["18%", "26%", "20%", "18%", "18%"],
            body: [
              [
                { text: "Invoice Date", style: "tableHeader" },
                { text: "Booking Date & Time", style: "tableHeader" },
                { text: "Booking Topic", style: "tableHeader" },
                { text: "Invoice Total Excl GST", style: "tableHeader" },
                { text: "GST Charged", style: "tableHeader" },
              ],
              [
                `${issueDate}`,
                `${appointmentDate}`,
                `${appointment.topic}`,
                `${payment.currency} ${payment.totalAmount}`,
                `${payment.currency} ${payment.totalFullAmount}`,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },

        { text: "", margin: [0, 10] },

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
        tableHeader: { bold: true, fontSize: 10, color: "black" },
        tableStyle: {
          margin: [0, 5, 0, 15],
          fontSize: 14,
        },
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },

      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public taxInvoiceTemplate(data: ITaxInvoiceReceipt): TDocumentDefinitions {
    const {
      recipientData,
      lfhCompanyData,
      appointment,
      payment,
      issueDate,
      appointmentDate,
      appointmentDescription,
      totalDuration,
    } = data;
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
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 150,
            },
            {
              alignment: "right",
              stack: [
                { text: "RECIPIENT CREATED TAX INVOICE", fontSize: 19 },
                { text: `Dated: ${issueDate}`, fontSize: 19 },
                { text: `FROM: ${recipientData.recipientName}`, fontSize: 19 },
                { text: `(Interpreter ID ${recipientData.recipientId})`, fontSize: 19 },
                recipientData.recipientAbnNumber
                  ? { text: `ABN ${recipientData.recipientAbnNumber}`, fontSize: 19 }
                  : [],
                {
                  text: recipientData.recipientAddress,
                  fontSize: 19,
                },
                { text: `TO: ${lfhCompanyData.companyName}`, fontSize: 19 },
                { text: `ABN ${lfhCompanyData.abnNumber}`, fontSize: 19 },
                { text: lfhCompanyData.companyAddress, fontSize: 19 },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            headerRows: 1,
            widths: ["12%", "18%", "30%", "10%", "10%", "10%", "10%"],
            body: [
              [
                { text: "Booking ID", fontSize: 10 },
                { text: "Date and Time Supply", fontSize: 10 },
                { text: "Description of the Taxable Services", fontSize: 10 },
                { text: "Duration Charged (mins)", fontSize: 10 },
                { text: "Value Excl GST", fontSize: 10 },
                { text: "GST Amount", fontSize: 10 },
                { text: "Value Including GST", fontSize: 10 },
              ],
              [
                { text: appointment.platformId, fontSize: 10 },
                { text: appointmentDate, fontSize: 10 },
                { text: appointmentDescription, fontSize: 10 },
                { text: totalDuration, fontSize: 10 },
                { text: `${payment.currency} ${payment.totalAmount}`, fontSize: 10 },
                { text: `${payment.currency} ${payment.totalGstAmount}`, fontSize: 10 },
                { text: `${payment.currency} ${payment.totalFullAmount}`, fontSize: 10 },
              ],
            ],
          },
        },
        "\n\n",
        {
          text: "Written Agreement",
          bold: true,
          fontSize: 12,
        },
        {
          text: `The recipient and the supplier declare that this agreement relates to the above supplies.
								The recipient can issue tax invoices for these supplies. The supplier will not issue tax
								invoices for these supplies. The supplier acknowledges that it is registered for GST and
								that it will notify the recipient if it ceases to be registered. The recipient acknowledges
								that it is registered for GST and that it will notify the supplier if it ceases to be registered.
								Acceptance of this recipient-created tax invoice (RCTI) constitutes acceptance of the
								terms of this written agreement. Both parties to this supply agree that they are parties
								to an RCTI agreement. The supplier must notify the recipient within 21 days of receiving
								this document if the supplier does not wish to accept the proposed agreement.`,
          fontSize: 10,
        },
        "\n\n",
        {
          text: "This form is used for record-keeping purposes only and will not calculate totals for you.",
          bold: true,
          fontSize: 10,
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
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public membershipInvoiceTemplate(data: IMembershipInvoice): TDocumentDefinitions {
    const { isUserFromAu, membershipType, payment, userRole, issueDate } = data;
    const tablePricingDetailsRow = isUserFromAu
      ? [
          { text: "Membership Plan", fontSize: 10 },
          { text: "Value Excl GST", fontSize: 10 },
          { text: "GST Amount", fontSize: 10 },
          { text: "Value Incl. GST", fontSize: 10 },
        ]
      : [
          { text: "Membership Plan", fontSize: 10 },
          { text: "Invoice Total", fontSize: 10 },
        ];
    const tablePricingDetailsDataRow = isUserFromAu
      ? [
          { text: membershipType.charAt(0).toUpperCase() + membershipType.slice(1), fontSize: 10 },
          { text: `${payment.totalAmount} ${payment.currency}`, fontSize: 10 },
          { text: `${payment.totalGstAmount} ${payment.currency}`, fontSize: 10 },
          { text: `${payment.totalFullAmount} ${payment.currency}`, fontSize: 10 },
        ]
      : [
          { text: membershipType.charAt(0).toUpperCase() + membershipType.slice(1), fontSize: 10 },
          { text: `${payment.totalFullAmount} ${payment.currency}`, fontSize: 10 },
        ];
    const billToTableBody = [
      [{ text: "Bill To" }, { text: `${userRole.profile.firstName} ${userRole.profile.lastName}` }],
      [{ text: "Address" }, { text: `${userRole.address.streetNumber} ${userRole.address.streetName}` }],
      [{ text: "Suburb/Town" }, { text: userRole.address.suburb }],
      [{ text: "State/Territory" }, { text: userRole.address.state }],
      [{ text: "Postcode" }, { text: userRole.address.postcode }],
    ];
    const soldToTableBody = [
      [{ text: "Sold To" }, `${userRole.profile.firstName} ${userRole.profile.lastName}`],
      [{ text: "Address" }, { text: `${userRole.address.streetNumber} ${userRole.address.streetName}` }],
      [{ text: "Suburb/Town" }, { text: userRole.address.suburb }],
      [{ text: "State/Territory" }, { text: userRole.address.state }],
      [{ text: "Postcode" }, { text: userRole.address.postcode }],
    ];

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
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 150,
            },
            {
              alignment: "right",
              stack: [
                { text: `Dated: ${issueDate}`, fontSize: 19, bold: true },
                { text: `Client ID ${userRole.user.platformId}`, fontSize: 19, bold: true },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            widths: ["46%", "8%", "46%"],
            body: [
              [
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: billToTableBody,
                  },
                  layout: {
                    heights: 50,
                  },
                },
                { text: " " },
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: soldToTableBody,
                  },
                },
              ],
            ],
          },
          layout: "noBorders",
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            headerRows: 1,
            widths: isUserFromAu ? ["12%", "18%", "30%", "10%", "10%", "10%", "10%"] : ["50%", "50%"],
            body: [tablePricingDetailsRow, tablePricingDetailsDataRow],
          },
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
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public async interpreterBadgeTemplate(data: IInterpreterBadge): Promise<TDocumentDefinitions> {
    const { companyName, userRole, interpreterRole, interpreterBadge } = data;
    const canvasYoffset = companyName ? 370 : 340;
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          image: LFH_LOGO_LIGHT,
          width: 100,
          alignment: "center",
          margin: [0, 20],
        },
        ...(companyName
          ? [
              {
                text: companyName ?? "",
                style: "roleName",
                alignment: "center" as Alignment,
                margin: [20, 0, 0, 10] as [number, number, number, number],
              },
            ]
          : []),
        {
          text: interpreterRole,
          style: "roleName",
          alignment: "center",
          margin: [20, 0, 0, 0],
        },
        {
          text: `${
            userRole.profile.title
              ? `${userRole.profile.title.charAt(0).toUpperCase()}${userRole.profile.title.slice(1)}. `
              : ""
          }${userRole.profile.preferredName ?? userRole.profile.firstName} ${userRole.profile.lastName}`,
          style: "interpreterName",
          alignment: "center",
          margin: [0, 20],
        },
        {
          text: `ID: ${userRole.user.platformId}`,
          style: "interpreterId",
          alignment: "center",
          margin: [5, 0, 0, 10],
        },
        {
          columns: [
            {
              width: 170,
              text: "",
            },
            {
              width: "auto",
              columns: [
                {
                  text: "Aggregate rating",
                  style: "ratingText",
                  margin: [0, 0, 5, 0],
                },
                {
                  image: RATING_STAR,
                  width: 20,
                  height: 20,
                  margin: [2, 0, 2, 0],
                },
                {
                  text: userRole.interpreterProfile.averageRating.toFixed(1),
                  style: "averageRating",
                  margin: [5, 0, 0, 0],
                },
              ],
              columnGap: 2,
            },
          ],
          margin: [0, 0, 0, 55],
        },
        {
          stack: [
            {
              image: await this.pdfBase64ImageConverterService.convertImageToBase64(
                userRole.user.avatarUrl,
                userRole.id,
              ),
              width: 300,
              height: 300,
              alignment: "center",
              margin: [0, 0, 0, 0],
            },
            {
              canvas: [
                {
                  type: "ellipse",
                  x: 180,
                  y: 180,
                  r1: 180,
                  r2: 180,
                  lineWidth: 80,
                  lineColor: "white",
                },
              ],
              absolutePosition: { x: 115, y: canvasYoffset },
            },
            {
              stack: [
                {
                  canvas: [
                    {
                      type: "ellipse",
                      x: 65,
                      y: 65,
                      r1: 65,
                      r2: 65,
                      color: "#eff9fe",
                    },
                  ],
                  absolutePosition: { x: 367, y: canvasYoffset + 210 },
                },
                {
                  image: `data:image/png;base64,${interpreterBadge}`,
                  width: 100,
                  height: 100,
                  absolutePosition: { x: 387, y: canvasYoffset + 225 },
                },
              ],
            },
          ],
          margin: [0, 20],
        },
      ],
      styles: {
        roleName: {
          fontSize: 20,
          bold: true,
          color: "#03091D",
        },
        interpreterName: {
          fontSize: 30,
          bold: true,
          color: "#03091D",
        },
        interpreterId: {
          fontSize: 18,
          color: "#03091D",
        },
        ratingText: {
          fontSize: 18,
          color: "#03091D",
        },
        averageRating: {
          fontSize: 18,
          bold: true,
          color: "#03091D",
        },
      },
      defaultStyle: {
        font: "OpenSans",
      },
    };

    return docDefinition;
  }

  public depositChargeReceiptTemplate(data: IDepositChargeReceipt): TDocumentDefinitions {
    const { lfhCompanyData, recipientData, payment, issueDate, paymentDate, paymentDescription, service } = data;
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
                recipientData.recipientAbnNumber ? [{ text: `ABN ${recipientData.recipientAbnNumber})` }] : [],
                { text: `(Company ID ${recipientData.recipientId})`, bold: true },
                { text: recipientData.recipientAddress },
              ],
            },
          ],
          margin: [0, 10, 0, 20],
        },
        { text: `Invoice Number ${payment.platformId} - PAID`, style: "subheader", margin: [0, 10, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ["14%", "16%", "14%", "14%", "14%", "14%", "14%"],
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
                issueDate,
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
            widths: ["15%", "55%", "15%", "15%"],
            body: [
              [
                { text: "Date", style: "tableHeader" },
                { text: "Description", style: "tableHeader" },
                { text: "Payment Total", style: "tableHeader" },
                { text: "This Invoice", style: "tableHeader" },
              ],
              [
                paymentDate,
                paymentDescription,
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
            widths: ["16%", "25%", "25%", "16%", "17%"],
            body: [
              [
                { text: "Transaction ID", style: "tableHeader" },
                { text: "Service", style: "tableHeader" },
                { text: "Date & Time", style: "tableHeader" },
                { text: "Company ID", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
              ],
              [
                payment.platformId,
                service,
                paymentDate,
                recipientData.recipientId,
                `${payment.currency} ${payment.totalFullAmount}`,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@linguafrancahub.com", link: "mailto:payments@linguafrancahub.com", color: "blue" },
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

  public payoutCorporateReceiptTemplate(data: ICorporatePayOutReceipt): TDocumentDefinitions {
    const { paymentsData, issueDate, recipientData, receiptNumber, adminFirstName } = data;
    const paymentTables: Content = [];
    for (const paymentData of paymentsData) {
      const { payment, appointmentServiceType, totalDuration, appointmentDate } = paymentData;
      paymentTables.push({
        table: {
          headerRows: 1,
          widths: ["16%", "12%", "14%", "28%", "14%", "16%"],
          body: [
            [
              { text: "Payment Date", style: "tableHeader" },
              { text: "Booking ID", style: "tableHeader" },
              { text: "Interpreter ID", style: "tableHeader" },
              { text: "Booking Type", style: "tableHeader" },
              { text: "Chargeable mins", style: "tableHeader" },
              { text: "Total Amount Paid", style: "tableHeader" },
            ],
            [
              `${issueDate}`,
              `#${payment.appointment.platformId}`,
              `${payment.appointment.interpreter.user.platformId}`,
              `${appointmentServiceType}`,
              `${totalDuration}`,
              `${payment.currency} ${payment.totalFullAmount}`,
            ],
          ],
        },
        margin: [0, 10, 0, 0],
      });
      paymentTables.push({
        table: {
          headerRows: 1,
          widths: ["18%", "26%", "20%", "18%", "18%"],
          body: [
            [
              { text: "Invoice Date", style: "tableHeader" },
              { text: "Booking Date & Time", style: "tableHeader" },
              { text: "Booking Topic", style: "tableHeader" },
              { text: "Invoice Total Excl GST", style: "tableHeader" },
              { text: "GST Charged", style: "tableHeader" },
            ],
            [
              `${issueDate}`,
              `${appointmentDate}`,
              `${payment.appointment.topic}`,
              `${payment.currency} ${payment.totalAmount}`,
              `${payment.currency} ${payment.totalGstAmount}`,
            ],
          ],
        },
        margin: [0, 10, 0, 20],
      });
    }

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
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 175,
            },
            {
              stack: [
                { text: "REMITTANCE ADVICE", fontSize: 25, bold: true, alignment: "right" },
                { text: `Invoice # ${receiptNumber}`, fontSize: 14, alignment: "right" },
                { text: "From: Lingua Franca Hub PTY LTD", fontSize: 14, bold: true, alignment: "right" },
                { text: "ABN 42 661 208 635", fontSize: 14, alignment: "right" },
                {
                  text: "36/1 Thread Lane, Waterloo, NSW, 2017, Australia",
                  fontSize: 14,
                  alignment: "right",
                },
                { text: " ", fontSize: 14, alignment: "right" },
                { text: `To: ${recipientData.recipientName}`, fontSize: 14, bold: true, alignment: "right" },
                recipientData.recipientAbnNumber
                  ? { text: `ABN ${recipientData.recipientAbnNumber}`, fontSize: 14, alignment: "right" }
                  : [],
                { text: `(Company ID ${recipientData.recipientId})`, fontSize: 14, alignment: "right" },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          stack: [
            { text: `Hi, ${adminFirstName},`, margin: [0, 10] },
            {
              text: `I am attaching your remittance advice for payment.`,
            },
            {
              text: "If you have any questions or need further assistance, feel free to reach out to us at interpreters@linguafrancahub.com",
              margin: [0, 10],
            },
            { text: "Best regards,\nLFH Customer Support Team", margin: [0, 10] },
          ],
        },

        ...paymentTables,

        { text: "", margin: [0, 10] },
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
        tableHeader: { bold: true, fontSize: 10, color: "black" },
        tableStyle: {
          margin: [0, 5, 0, 15],
          fontSize: 14,
        },
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },

      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public taxInvoiceCorporateTemplate(data: ICorporateTaxInvoiceReceipt): TDocumentDefinitions {
    const { paymentsData, issueDate, recipientData, lfhCompanyData } = data;
    const paymentTables: TableCell[][] = [];
    for (const paymentData of paymentsData) {
      const { payment, appointmentDate, appointmentDescription, totalDuration } = paymentData;
      paymentTables.push([
        { text: payment.appointment.platformId, fontSize: 10 },
        { text: payment.appointment.interpreter.user.platformId, fontSize: 10 },
        { text: appointmentDate, fontSize: 10 },
        { text: appointmentDescription, fontSize: 10 },
        { text: totalDuration, fontSize: 10 },
        { text: `${payment.currency} ${payment.totalAmount}`, fontSize: 10 },
        { text: `${payment.currency} ${payment.totalGstAmount}`, fontSize: 10 },
        { text: `${payment.currency} ${payment.totalFullAmount}`, fontSize: 10 },
      ]);
    }

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
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 150,
            },
            {
              alignment: "right",
              stack: [
                { text: "RECIPIENT CREATED TAX INVOICE", fontSize: 19 },
                { text: ` `, fontSize: 12 },
                { text: `Dated: ${issueDate}`, fontSize: 12 },
                { text: ` `, fontSize: 12 },
                { text: `FROM: ${recipientData.recipientName}`, fontSize: 12, bold: true },
                { text: `(Company ID ${recipientData.recipientId})`, fontSize: 12 },
                recipientData.recipientAbnNumber
                  ? { text: `ABN ${recipientData.recipientAbnNumber}`, fontSize: 12 }
                  : [],
                { text: recipientData.recipientAddress, fontSize: 12 },
                { text: ` `, fontSize: 12 },
                { text: `TO: ${lfhCompanyData.companyName}`, fontSize: 12, bold: true },
                { text: `ABN ${lfhCompanyData.abnNumber}`, fontSize: 12 },
                { text: lfhCompanyData.companyAddress, fontSize: 12 },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            headerRows: 1,
            widths: ["12%", "10%", "18%", "20%", "10%", "10%", "10%", "10%"],
            body: [
              [
                { text: "Booking ID", fontSize: 10 },
                { text: "Interpreter ID", fontSize: 10 },
                { text: "Date and Time Supply", fontSize: 10 },
                { text: "Description of the Taxable Services", fontSize: 10 },
                { text: "Duration Charged (mins)", fontSize: 10 },
                { text: "Value Excl GST", fontSize: 10 },
                { text: "GST Amount", fontSize: 10 },
                { text: "Value Including GST", fontSize: 10 },
              ],
              ...paymentTables,
            ],
          },
        },

        "\n\n",

        {
          text: "Written Agreement",
          bold: true,
          fontSize: 12,
        },
        {
          text: `The recipient and the supplier declare that this agreement relates to the above supplies. The recipient can issue tax invoices for these supplies. The supplier will not issue tax invoices for these supplies. The supplier acknowledges that it is registered for GST and that it will notify the recipient if it ceases to be registered. The recipient acknowledges that it is registered for GST and that it will notify the supplier if it ceases to be registered. Acceptance of this recipient-created tax invoice (RCTI) constitutes acceptance of the terms of this written agreement. Both parties to this supply agree that they are parties to an RCTI agreement. The supplier must notify the recipient within 21 days of receiving this document if the supplier does not wish to accept the proposed agreement.`,
          fontSize: 10,
        },
        "\n\n",
        {
          text: "This form is used for record-keeping purposes only and will not calculate totals for you.",
          bold: true,
          fontSize: 10,
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
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }
}
