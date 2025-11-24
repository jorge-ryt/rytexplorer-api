import { Module } from '@nestjs/common';

import { NftsService } from '@Modules/NFTs/nfts.service';
import { PrismaModule } from '@Prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NftsService],
  exports: [NftsService],
})
export class NFTsModule {}
