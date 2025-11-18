import { Module } from '@nestjs/common';
import { WalletAuthService } from './wallet-auth.service';
import { WalletAuthResolver } from './wallet-auth.resolver';
import { PrismaService } from '../../prisma/prisma.service';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { JwtUtils } from 'src/common/utils/jwt.utils';
import { CryptoUtils } from 'src/common/utils/crypto.utils';

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
