export interface IBlock {
  id: bigint;
  block_hash: string;
  version: string;
  merkle_root: string;
  block_number: string;
  block_status?: string; // defaults to "confirmed"
  previous_hash: string;
  state_root: string;
  transaction_root: string;
  reciept_root: string;
  timestamp?: string;
  logs_bloom: string;
  block_reward: string;
  value: string;
  data: string;
  to: string;
  blockTxnsCount: number;
}

export interface IBlockData {
  version: number;
  merkle_root: string;
  block_number: number;
  previous_hash: string;
  state_root: string;
  transaction_root: string;
  reciept_root: string;
  timestamp: number;
  logs_bloom: string;
  transactions: string[];
  block_reward: string;
  value: string;
  data: string;
  to: string;
  block_hash: string;
}
