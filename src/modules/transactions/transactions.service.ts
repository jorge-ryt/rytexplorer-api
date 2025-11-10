import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

    // Convert BigInt IDs to string
    const transactionsWithStringId = transactions.map((tx) => ({
      ...tx,
      id: tx.id.toString(),
    }));

    return { count, transactions: transactionsWithStringId };
  }

  async getTransactionsByBlock(blockNumber: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        block_number: blockNumber,
      },
      orderBy: { id: 'desc' },
    });

    // convert BigInts to strings for GraphQL safety
    return transactions.map((tx) => ({
      ...tx,
      id: tx.id?.toString?.() ?? tx.id,
      value: tx.value?.toString?.() ?? tx.value,
      gas: tx.gas?.toString?.() ?? tx.gas,
      gas_price: tx.gas_price?.toString?.() ?? tx.gas_price,
      nonce: tx.nonce?.toString?.() ?? tx.nonce,
    }));
  }
}
