import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async getBlocks(limit = 10, lastId?: string) {
    const count = await this.prisma.block.count();

    const blocks = await this.prisma.block.findMany({
      take: limit,
      skip: lastId ? 1 : 0,
      ...(lastId && { cursor: { id: BigInt(lastId) } }),
      orderBy: { id: 'desc' },
      include: {
        transactions: true,
      },
    });

    // Convert BigInt fields to strings for GraphQL
    return {
      count,
      blocks: blocks.map((block) => ({
        ...block,
        id: block.id.toString(),
        blockTxnsCount: block.transactions.length,
        transactions: block.transactions.map((tx) => ({
          ...tx,
          id: tx.id.toString(),
        })),
      })),
    };
  }

  async getBlockByNumber(blockNumber: string) {
    // ✅ Ensure it's a string before passing to Prisma
    const block = await this.prisma.block.findUnique({
      where: { block_number: blockNumber.toString() },
      include: { transactions: true },
    });

    if (!block) return null;

    // ✅ Convert BigInt fields before returning to GraphQL
    return {
      ...block,
      id: block.id.toString(),
      block_number: block.block_number.toString(),
      transactions: block.transactions.map((tx) => ({
        ...tx,
        id: tx.id.toString(),
        block: tx.block ? tx.block.toString() : null,
      })),
    };
  }
}
