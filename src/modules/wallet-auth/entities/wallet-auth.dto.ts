import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class RequestMessageInput {
  @Field()
  address: string;
}

@ObjectType()
export class MessagePayload {
  @Field()
  nonce: string;

  @Field()
  timestamp: string;

  @Field()
  message: string;
}

@InputType()
export class VerifySignatureInput {
  @Field()
  address: string;

  @Field()
  signature: string;
}

@ObjectType()
export class AuthToken {
  @Field()
  success: boolean;
}
