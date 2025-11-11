import { Logger } from '@nestjs/common';

const logger = new Logger('TxUtils');

/**
 * Extracts the transaction hash from various transaction object shapes.
 * This supports nested structures (e.g. TransferObj, obj, etc.)
 */
export function extractTxHash(item: any): string | null {
  if (!item) return null;

  // Try multiple known patterns
  const hash =
    item.hash ??
    item.transaction_hash ??
    item.tx_hash ??
    item.obj?.hash ??
    item.TransferObj?.hash ??
    item.VoteObj?.hash ??
    item.TransactionObj?.hash ??
    null;

  if (!hash) {
    logger.verbose(
      `[extractTxHash] Could not find hash in item: ${JSON.stringify(item).slice(0, 200)}...`,
    );
  }

  return hash;
}

/**
 * Normalize or clean transaction data.
 * You can extend this later for all queue types.
 */
export function normalizeTxData(item: any) {
  const hash = extractTxHash(item);

  return {
    hash,
    from:
      item.from ??
      item.TransferObj?.from ??
      item.obj?.from ??
      item.VoteObj?.from ??
      null,
    to:
      item.to ??
      item.TransferObj?.to ??
      item.obj?.to ??
      item.VoteObj?.to ??
      null,
    value: String(
      item.value ?? item.TransferObj?.value ?? item.obj?.value ?? '0',
    ),
    raw: item, // keep the original for reference
  };
}
