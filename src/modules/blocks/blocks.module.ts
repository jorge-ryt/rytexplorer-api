import { Module } from '@nestjs/common';

import { BlocksResolver } from '@Modules/blocks/blocks.resolver';
import { BlocksService } from '@Modules/blocks/blocks.service';
import { PrismaModule } from '@Prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BlocksResolver, BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
