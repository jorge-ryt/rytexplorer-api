import { Injectable, InternalServerErrorException } from '@nestjs/common';
import jwt, { JwtPayload as JwtPayloadBase, SignOptions } from 'jsonwebtoken';

export interface JwtPayload extends JwtPayloadBase {
  address: string;
}

@Injectable()
export class JwtUtils {
  private readonly SECRET: string;
  private readonly DEFAULT_EXPIRES_IN: number = 86400; // 24 hours in seconds

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Prevent runtime failures later on
      throw new InternalServerErrorException('JWT_SECRET is not defined');
    }
    this.SECRET = secret;
  }

  /**
   * Signs a payload into a JWT string.
   */
  sign(payload: JwtPayload, expiresIn?: string | number): string {
    const options: SignOptions = {
      expiresIn: expiresIn ?? this.DEFAULT_EXPIRES_IN,
    } as SignOptions;
    return jwt.sign(payload, this.SECRET, options);
  }

  /**
   * Verifies a JWT and returns its decoded payload if valid.
   */
  verify(token: string): JwtPayload | null {
    try {
      // verify() returns string | JwtPayload
      const result = jwt.verify(token, this.SECRET);
      if (typeof result === 'string') return null;

      // Narrowed type: JwtPayloadBase
      if (!('address' in result)) return null;

      return result as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Decodes a JWT without verifying its signature.
   */
  decode(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') return null;

      if (!('address' in decoded)) return null;

      return decoded as JwtPayload;
    } catch {
      return null;
    }
  }
}
