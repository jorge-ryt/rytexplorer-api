import { Injectable } from '@nestjs/common';

import { PrismaService } from '@Prisma/prisma.service';

interface NFTs {
  id: string;
  name: string;
  type: string;
  min_price: string;
  max_price: string;
  transfers: string;
  owners: string;
  total_assets: string;
}
interface NFTsTopResponse {
  count: number;
  topNfts: NFTs[];
}
@Injectable()
export class NftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTop(limit: number, lastId?: string): Promise<NFTsTopResponse> {
    try {
      const [topNfts, count] = await Promise.all([
        this.prisma.nFTs.findMany({
          take: limit,
          ...(lastId && { cursor: { id: lastId }, skip: 1 }),
          orderBy: { id: 'desc' },
        }),
        this.prisma.nFTs.count(),
      ]);

      return { count, topNfts };
    } catch (error) {
      this.logger.error(
        `Failed to fetch top NFTs: ${(error as Error).message}`,
      );
      throw new BadRequestException('Failed to fetch top NFTs');
    }
  }
}
