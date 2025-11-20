import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WalletAuthService } from '@Modules/wallet-auth/wallet-auth.service';

interface GqlRequest {
  headers: Record<string, string | undefined>;
  user?: JwtPayload; // attach JWT payload later
}

interface JwtPayload {
  address: string;
  iat?: number;
  exp?: number;
}

interface GqlContext {
  req: GqlRequest;
}

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private readonly authService: WalletAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext<GqlContext>();
    const req = ctx.req;

    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) throw new UnauthorizedException('Missing token');

    const payload = this.authService.verifyJwt(token) as JwtPayload | null;
    if (!payload) throw new UnauthorizedException('Invalid token');

    // Safely attach user to the request
    req.user = payload;

    return true;
  }
}
