import { Module } from '@nestjs/common';

import { GqlAuthGuard } from '@Guards/gql-auth.guard';
import { WalletAuthResolver } from '@Modules/wallet-auth/wallet-auth.resolver';
import { WalletAuthService } from '@Modules/wallet-auth/wallet-auth.service';
import { PrismaService } from '@Prisma/prisma.service';
import { CryptoUtils } from '@Utils/crypto.utils';
import { JwtUtils } from '@Utils/jwt.utils';

@Module({
  providers: [
    WalletAuthResolver,
    WalletAuthService,
    PrismaService,
    CryptoUtils,
    JwtUtils,
    {
      // Provide the guard so it can inject WalletAuthService if needed.
      provide: GqlAuthGuard,
      useFactory: (walletAuthService: WalletAuthService) => {
        return new GqlAuthGuard(walletAuthService);
      },
      inject: [JwtUtils, WalletAuthService],
    },
  ],
  exports: [WalletAuthService, JwtUtils, CryptoUtils],
})
export class WalletAuthModule {}
