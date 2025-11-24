import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { NFTs, NFTsTopResponse } from '@Interfaces/ntfs';
import { PrismaService } from '@Prisma/prisma.service';

@Injectable()
export class NftsService {
  private readonly logger = new Logger(NftsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTop(limit: number, lastId?: string): Promise<NFTsTopResponse> {
    try {
      const queries: [Promise<NFTs[]>, Promise<number>] = [
        this.prisma.nFTs.findMany({
          take: limit,
          ...(lastId && { cursor: { id: lastId }, skip: 1 }),
          orderBy: { id: 'desc' },
        }),
        this.prisma.nFTs.count(),
      ];

      const [topNfts, count] = await Promise.all(queries);

      return { count, topNfts };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch top NFTs: ${message}`);
      throw new BadRequestException('Failed to fetch top NFTs');
    }
  }
}
