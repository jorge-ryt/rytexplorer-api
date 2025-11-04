import { Module } from '@nestjs/common';
import { BlocksResolver } from './blocks.resolver';
import { BlocksService } from './blocks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BlocksResolver, BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
