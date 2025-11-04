export const NODE_URLS = process.env.NODE_URLs
  ? process.env.NODE_URLs.split(',')
  : [];

export const REDIS_QUEUES = {
  MEMPOOL: process.env.MEMPOOL_REDIS_QUEUE,
  BALLOT: process.env.BALLOT_REDIS_QUEUE,
  BLOCK: process.env.BLOCK_REDIS_QUEUE,
  TRANSACTION: process.env.TRANSACTION_REDIS_QUEUE,
  LOOKUP_MEMPOOL: process.env.LOOKUP_MEMPOOL_REDIS_QUEUE,
  LOOKUP_BALLOT: process.env.LOOKUP_BALLOT_REDIS_QUEUE,
};

export const INDEXER_CONFIG = {
  RETRY_INTERVAL_MS: Number(process.env.WAIT_TO_BE_MINED) || 3000,
  MAX_RETRIES: Number(process.env.TOTAL_NO_OF_RETRIES) || 10,
};
