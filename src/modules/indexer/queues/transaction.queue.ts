import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import type { Prisma } from '@prisma/client';

import { EpochData, Transaction } from '@Interfaces/transactions';
import { WsBroadcastGateway } from '@Modules/indexer/indexer.ws-broadcast.gateway';
import { PrismaService } from '@Prisma/prisma.service';
import { RedisService } from '@Redis/redis.service';
import { extractTxHash } from '@Utils/tx-utils';

type UnknownRecord = Record<string, unknown>;

/**
 * Helpers to safely extract values from unknown objects (no `any`)
 */
function isObject(u: unknown): u is UnknownRecord {
  return typeof u === 'object' && u !== null;
}

function isEpochData(value: unknown): value is EpochData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.epochCycle === 'number' &&
    Array.isArray(v.hashes) &&
    v.hashes.every((h) => typeof h === 'string') &&
    typeof v.hashesHex === 'string'
  );
}

function getString(obj: unknown, ...keys: string[]): string | null {
  if (!isObject(obj)) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'bigint') return v.toString();
  }
  return null;
}

function getBigInt(obj: unknown, ...keys: string[]): bigint | null {
  if (!isObject(obj)) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number' && Number.isInteger(v)) return BigInt(v);
    if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  }
  return null;
}

/**
 * TransactionQueue - processes transaction payloads saved in Redis.
 *  - fully typed (no `any`)
 *  - builds Prisma.TransactionCreateInput objects for create()
 */
@Injectable()
export class TransactionQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionQueue.name);
  private running = true;
  private readonly queueKey =
    process.env.TRANSACTION_REDIS_QUEUE ?? 'transactionRedisQueue';

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly wsBroadcast: WsBroadcastGateway,
  ) {}

  /** Public API — enqueue new transaction(s) into Redis */
  async enqueue(txData: EpochData | Partial<Transaction>): Promise<void> {
    const redis = this.redisService.getClient();
    this.logger.debug(`💸 txData data ${JSON.stringify(txData)}`);
    try {
      if (!txData) {
        this.logger.warn('Attempted to enqueue empty transaction data');
        return;
      }

      const serialized = JSON.stringify(txData);
      await redis.rpush(this.queueKey, serialized);

      let txHash;

      if (isEpochData(txData)) {
        txHash =
          'hash' in txData
            ? txData.hash
            : Array.isArray(txData.hashes)
              ? txData.hashes[0]
              : 'unknown';
      } else if (typeof txData === 'object') {
        txHash = extractTxHash(txData) ?? 'unknown';
      }

      this.logger.debug(`💸 Enqueued transaction ${txHash}`);
      this.logger.debug(`💸 Enqueued transaction ${txHash}`);
    } catch (err) {
      this.logger.error('Failed to enqueue transaction', err);
    }
  }

  // Module lifecycle — start processing queue
  onModuleInit() {
    this.logger.log(`Starting TransactionQueue listener on ${this.queueKey}`);
    this.processQueue().catch((err) => {
      this.logger.error('TransactionQueue startup error', err);
    });
  }

  // Module lifecycle — stop processing queue
  onModuleDestroy() {
    this.running = false;
    this.logger.log('Stopping TransactionQueue');
  }

  // Utility: sleep
  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Utility: parse payload from Redis (returns unknown, safe to inspect)
  private parsePayload(raw: string): EpochData | null {
    try {
      const parsed: unknown = JSON.parse(raw);

      if (isObject(parsed) && 'obj' in parsed) {
        const inner = (parsed as Record<string, unknown>).obj;
        if (isEpochData(inner)) return inner;
      }

      if (isEpochData(parsed)) return parsed;

      return null;
    } catch {
      try {
        // legacy fallback for serialize-javascript encoded payloads
        const evaluated: unknown = eval(`(${raw})`);

        if (isObject(evaluated) && 'obj' in evaluated) {
          const inner = (evaluated as Record<string, unknown>).obj;
          if (isEpochData(inner)) return inner;
        }

        if (isEpochData(evaluated)) return evaluated;

        return null;
      } catch (ee) {
        this.logger.error('Failed to parse Redis tx payload', ee);
        return null;
      }
    }
  }

  // Core: process queue items
  private async processQueue() {
    const redis = this.redisService.getClient();

    while (this.running) {
      try {
        const length = await redis.llen(this.queueKey);
        if (length > 0) {
          const raw = await redis.lindex(this.queueKey, 0);
          if (!raw) {
            await redis.lpop(this.queueKey);
            continue;
          }

          const payload = this.parsePayload(raw);
          if (!payload) {
            this.logger.warn('Malformed tx payload — dropping');
            await redis.lpop(this.queueKey);
            continue;
          }

          // payload may be an array of txs, or an object representing one tx (depending on producer)
          let txItems: unknown;
          if (Array.isArray(payload)) {
            txItems = payload;
          } else if (isObject(payload) && 'data' in payload) {
            txItems = payload.data;
          } else {
            txItems = payload;
          }

          // normalize to array
          const txArray: unknown[] = Array.isArray(txItems)
            ? txItems
            : [txItems];

          for (const item of txArray) {
            // item can be different shapes. read safely using helpers
            const txCandidate =
              isObject(item) && 'TransferObj' in item ? item.TransferObj : item;

            // The tx object may live in txCandidate or item
            const tx = isObject(txCandidate)
              ? txCandidate
              : isObject(item)
                ? item
                : {};

            const txHash =
              getString(tx, 'hash', 'Hash') ??
              getString(item, 'hash', 'Hash') ??
              null;

            if (!txHash) {
              this.logger.warn('Transaction missing hash, skipping', tx);
              continue;
            }

            const exists = await this.prisma.transaction
              .findUnique({
                where: { hash: txHash },
              })
              .catch(() => null);

            if (exists) {
              this.logger.debug(`Duplicate transaction (skipping): ${txHash}`);
              continue;
            }

            // Try multiple common locations for block number — prefer the normalized `tx` object
            const rawBlockNumber =
              getString(tx, 'block', 'block_number', 'blockNumber') ??
              getString(item, 'block', 'block_number', 'blockNumber') ??
              '';
            const blockNumber =
              rawBlockNumber !== '' ? rawBlockNumber : undefined;

            // Build Prisma.TransactionCreateInput safely
            const createData: Prisma.TransactionCreateInput = {
              // required fields according to your Prisma model must be present
              hash: txHash,
              transaction_Status:
                getString(item, 'transaction_Status', 'transactionStatus') ??
                'Pending',
              from: getString(tx, 'from') ?? getString(item, 'from') ?? '',
              to: getString(tx, 'to') ?? getString(item, 'to') ?? '',
              value: getString(tx, 'value') ?? getString(item, 'value') ?? '0',
              transaction_time: getString(item, 'transaction_time') ?? null,
              functionType:
                getString(tx, 'functionType') ?? getString(item, 'type') ?? '',
              unix_timestamp:
                getBigInt(item, 'unix_timestamp') ??
                getBigInt(tx, 'unix_timestamp') ??
                null,
              Status: (() => {
                const v =
                  (isObject(item) ? item.Status : undefined) ??
                  (isObject(tx) ? tx.Status : undefined);
                return typeof v === 'boolean' ? v : null;
              })(),
              State: (() => {
                const v =
                  (isObject(item) ? item.State : undefined) ??
                  (isObject(tx) ? tx.State : undefined);
                return typeof v === 'boolean' ? v : null;
              })(),
              nonce: getString(tx, 'nonce') ?? getString(item, 'nonce') ?? '',
              type: getString(tx, 'type') ?? getString(item, 'type') ?? '',
              node_id:
                getString(tx, 'node_id') ?? getString(item, 'node_id') ?? '',
              gas: getString(tx, 'gas') ?? getString(item, 'gas') ?? '0',
              gas_price:
                getString(tx, 'gas_price') ??
                getString(item, 'gas_price') ??
                '0',
              input: getString(tx, 'input') ?? getString(item, 'input') ?? '',
              // relation to block (only include if we have a blockNumber)
              ...(blockNumber
                ? { block: { connect: { block_number: blockNumber } } }
                : {}),
            };

            // Create record (types line up with Prisma.TransactionCreateInput)
            await this.prisma.transaction.create({
              data: createData,
            });

            // broadcast
            try {
              this.wsBroadcast.broadcast('confirmed-transaction', createData);
            } catch (err) {
              this.logger.warn('Broadcast failed for transaction', err);
            }

            this.logger.log(`Saved tx ${txHash}`);
            // mark as seen
            await redis.sadd('seen_set_transactions', txHash);
          }

          // After processing batch, pop head element
          await redis.lpop(this.queueKey);
        } else {
          await this.sleep(2000);
        }
      } catch (err) {
        this.logger.error('TransactionQueue processing error', err);
        await this.sleep(2000);
      }
    }
  }
}
