import { Injectable } from '@nestjs/common';

import { PrismaService } from '@Prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(limit: number, lastId?: string) {
    const transactions = await this.prisma.transaction.findMany({
      take: limit,
      ...(lastId && { cursor: { hash: lastId }, skip: 1 }),
      orderBy: { id: 'desc' },
    });

    const transactionsWithStringId = transactions.map((tx) => ({
      ...tx,
      id: tx.id.toString(),
      // convert BigInt/number fields to string for GraphQL String fields
      unix_timestamp:
        tx.unix_timestamp != null ? tx.unix_timestamp.toString() : null,
      value: tx.value?.toString?.() ?? tx.value,
      gas: tx.gas?.toString?.() ?? tx.gas,
      gas_price: tx.gas_price?.toString?.() ?? tx.gas_price,
      nonce: tx.nonce?.toString?.() ?? tx.nonce,
      // expose the scalar foreign-key `block_number` as `block` for GraphQL
      block: tx.block_number ?? null,
    }));

    const count = await this.prisma.transaction.count();

    return { count, transactions: transactionsWithStringId };
  }

  async getTransactionByHash(hash: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { hash },
    });

    if (!tx) return null;

    // Convert BigInt ID to string
    return {
      ...tx,
      id: tx.id.toString(),
      unix_timestamp:
        tx.unix_timestamp != null ? tx.unix_timestamp.toString() : null,
      value: tx.value?.toString?.() ?? tx.value,
      gas: tx.gas?.toString?.() ?? tx.gas,
      gas_price: tx.gas_price?.toString?.() ?? tx.gas_price,
      nonce: tx.nonce?.toString?.() ?? tx.nonce,
      // map scalar foreign-key to GraphQL field `block`
      block: tx.block_number ?? null,
    };
  }

  async getTransactionsByAddress(address: string, limit = 10, lastId?: string) {
    const count = await this.prisma.transaction.count({
      where: {
        OR: [{ from: address }, { to: address }],
      },
    });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ from: address }, { to: address }],
      },
      take: limit,
      skip: lastId ? 1 : 0,
      ...(lastId && { cursor: { id: BigInt(lastId) } }),
      orderBy: { id: 'desc' },
      include: { block: true },
    });

    // Convert BigInt IDs and numeric fields to string for GraphQL
    const transactionsWithStringId = transactions.map((tx) => ({
      ...tx,
      id: tx.id.toString(),
      unix_timestamp:
        tx.unix_timestamp != null ? tx.unix_timestamp.toString() : null,
      value: tx.value?.toString?.() ?? tx.value,
      gas: tx.gas?.toString?.() ?? tx.gas,
      gas_price: tx.gas_price?.toString?.() ?? tx.gas_price,
      nonce: tx.nonce?.toString?.() ?? tx.nonce,
      // include block number as `block` (either scalar or included relation)
      block: tx.block_number ?? null,
    }));

    return { count, transactions: transactionsWithStringId };
  }

  async getTransactionsByBlock(
    blockNumber: string,
    limit = 10,
    lastId?: string,
  ) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        block_number: blockNumber,
      },
      take: limit,
      skip: lastId ? 1 : 0,
      ...(lastId && { cursor: { id: BigInt(lastId) } }),
      orderBy: { id: 'desc' },
    });

    // convert BigInts to strings for GraphQL safety
    return transactions.map((tx) => ({
      ...tx,
      id: tx.id?.toString?.() ?? tx.id,
      // surface the scalar FK as `block` for GraphQL
      block: tx.block_number ?? tx.block_number ?? null,
      value: tx.value?.toString?.() ?? tx.value,
      gas: tx.gas?.toString?.() ?? tx.gas,
      gas_price: tx.gas_price?.toString?.() ?? tx.gas_price,
      nonce: tx.nonce?.toString?.() ?? tx.nonce,
    }));
  }
}
