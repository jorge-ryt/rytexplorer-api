import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionsWithCount } from './entities/transactions-with-count.entity';

@Resolver()
export class TransactionsResolver {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Query(() => TransactionsWithCount)
  transactions(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('lastId', { type: () => String, nullable: true }) lastId?: string,
  ) {
    return this.transactionsService.getTransactions(limit, lastId);
  }

  @Query(() => Transaction, { nullable: true })
  transaction(@Args('hash') hash: string) {
    return this.transactionsService.getTransactionByHash(hash);
  }

  @Query(() => TransactionsWithCount)
  transactionsByAddress(
    @Args('address') address: string,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('lastId', { type: () => String, nullable: true }) lastId?: string,
  ) {
    return this.transactionsService.getTransactionsByAddress(
      address,
      limit,
      lastId,
    );
  }
}
