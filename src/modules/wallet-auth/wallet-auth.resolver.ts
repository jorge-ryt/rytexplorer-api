import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import type { Response } from 'express';

import { WalletAuthService } from './wallet-auth.service';
import {
  RequestMessageInput,
  VerifySignatureInput,
  MessagePayload,
  AuthToken,
} from './entities/wallet-auth.dto';

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
