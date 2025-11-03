export interface ICommissionAmountsCaptureContext {
  /**
   * The total commission amount deducted from the original payment amount for the platform.
   * Calculated as `originalAmount * (platformCommissionRate / 100)`.
   */
  commissionAmount: number;
  /**
   * The refund amount to be returned to the company after deducting the platform commission.
   * Calculated as `originalAmount - commissionAmount`.
   */
  refundAmount: number;
  /**
   * The commission amount excluding GST (Goods and Services Tax), if the company is a GST payer.
   * If not a GST payer, this equals `commissionAmount`.
   * Calculated as `commissionAmount / GST_COEFFICIENT`
   */
  commissionWithoutGst: number;
  /**
   * The GST component of the commission amount, applicable only if the company is a GST payer.
   * Calculated as `commissionAmount - commissionWithoutGst`.
   * Defaults to 0 if not a GST payer.
   */
  commissionGstAmount: number;
  /**
   * The refund percentage as a string, rounded to one decimal place (e.g., "90.0").
   * Represents the percentage of the original amount that is refunded to the company.
   * Calculated as `((refundAmount / originalAmount) * 100).toFixed(1)`.
   */
  refundPercent: string;
  /**
   * The commission percentage as a string, rounded to one decimal place (e.g., "10.0").
   * Represents the percentage of the original amount taken as platform commission.
   * Calculated as `((commissionAmount / originalAmount) * 100).toFixed(1)`.
   */
  commissionPercent: string;
}
