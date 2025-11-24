export interface NFTs {
  id: string;
  name: string;
  type: string;
  min_price: string;
  max_price: string;
  transfers: string;
  owners: string;
  total_assets: string;
}

export interface NFTsTopResponse {
  count: number;
  topNfts: NFTs[];
}
