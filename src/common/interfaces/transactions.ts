import { Block } from '@Interfaces/blocks';

export interface Transaction {
  id: bigint;
  hash: string;
  transaction_Status: string;
  from: string;
  to: string;
  value: string;
  transaction_time?: string;
  functionType: string;
  unix_timestamp?: bigint;
  Status?: boolean;
  State?: boolean;
  nonce: string;
  type: string;
  node_id: string;
  gas: string;
  gas_price: string;
  input: string;

  block?: Block;
  block_number?: string;
}

export interface EpochData {
  epochCycle: number;
  hashes: `0x${string}`[];
  hashesHex: string;
}
