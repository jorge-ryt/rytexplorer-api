import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';

import {
  RequestMessageInput,
  VerifySignatureInput,
  MessagePayload,
  AuthToken,
} from '@Modules/wallet-auth/entities/wallet-auth.dto';
import { WalletAuthService } from '@Modules/wallet-auth/wallet-auth.service';

import type { Response } from 'express';

@Resolver()
export class WalletAuthResolver {
  constructor(private readonly walletAuthService: WalletAuthService) {}

  @Mutation(() => MessagePayload)
  async requestAuthMessage(@Args('input') input: RequestMessageInput) {
    return this.walletAuthService.createMessage(input.address);
  }

  @Mutation(() => AuthToken)
  async verifyWalletSignature(
    @Args('input') input: VerifySignatureInput,
    @Context() context: { req: Request; res: Response },
  ) {
    return this.walletAuthService.verifySignature(
      input.address,
      input.signature,
      context.res,
    );
  }
}
