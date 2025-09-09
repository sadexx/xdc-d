export interface OldICalculatePrice {
  price: number;
  priceByBlocks: OldIPriceByBlock[];
  addedDurationToLastBlockWhenRounding: number;
}

export interface OldIPriceByBlock {
  price: number;
  duration: number;
}
