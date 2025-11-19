import { Injectable } from '@nestjs/common';

import { PrismaService } from '@Prisma/prisma.service';

@Injectable()
export class NftsService {
  constructor(private readonly prisma: PrismaService) {}
}
