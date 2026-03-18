import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { ethers } from 'ethers';
import * as jwt from 'jsonwebtoken';

import { PrismaService } from '@Prisma/prisma.service';

import type { Response } from 'express';

export interface JwtPayload {
  address: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class WalletAuthService {
  private readonly JWT_SECRET: string;
  private readonly DEFAULT_EXPIRATION = '24h';
  private readonly logger = new Logger(WalletAuthService.name);

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.JWT_SECRET) {
      this.logger.debug(`No JWT_SECRET provided`);
      throw new Error('JWT_SECRET environment variable is missing');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
  }

  /**
   * Generate a message for the user to sign, including a random nonce and timestamp.
   */
  async createMessage(address: string): Promise<{
    nonce: string;
    timestamp: string;
    message: string;
  }> {
    const nonce = Math.floor(Math.random() * 1e6).toString();
    const timestampUnFormatted = Date.now().toString();
    const date = new Date(Number(timestampUnFormatted));
    const timestamp = date.toLocaleString();

    const message = `Welcome to RYT Explorer - Authentication\n\nNonce: ${nonce}\nTimestamp: ${timestamp}\nWallet: ${address}`;

    await this.prisma.walletUser.upsert({
      where: { address },
      update: { nonce, timestamp },
      create: { address, nonce, timestamp },
    });

    return { nonce, timestamp, message };
  }

  /**
   * Verify that the wallet signature corresponds to the provided address.
   * If successful, returns a signed JWT token.
   */
  async verifySignature(
    address: string,
    signature: string,
    res: Response,
  ): Promise<{ success: boolean }> {
    try {
      const user = await this.prisma.walletUser.findUnique({
        where: { address },
      });

      if (!user) {
        this.logger.debug(`User not found for address: ${address}`);
        throw new InternalServerErrorException('User not found');
      }

      // Build the exact same message that was signed
      const message = `Welcome to RYT Explorer - Authentication\n\nNonce: ${user.nonce}\nTimestamp: ${user.timestamp}\nWallet: ${address}`;

      // Use typed verifyMessage import
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (err: unknown) {
        const emsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`verifyMessage failed: ${emsg}`);
        throw new InternalServerErrorException('Signature verification failed');
      }

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        this.logger.warn(
          `Recovered address does not match: ${recoveredAddress} !== ${address}`,
        );
        throw new InternalServerErrorException('Invalid signature');
      }

      // Sign JWT synchronously and ensure we received a string
      const token = jwt.sign({ address } as JwtPayload, this.JWT_SECRET, {
        expiresIn: this.DEFAULT_EXPIRATION,
      });

      if (!token || typeof token !== 'string') {
        this.logger.error('jwt.sign did not return a token string');
        throw new InternalServerErrorException('Failed to generate token');
      }

      this.logger.debug(
        `Generated token (first 16 chars): ${token.slice(0, 16)}`,
      );

      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      // Rotate nonce to prevent replay attacks
      try {
        await this.prisma.walletUser.update({
          where: { address },
          data: { nonce: Math.floor(Math.random() * 1e9).toString() },
        });
      } catch {
        this.logger.warn('Failed to rotate nonce after login (non-fatal)');
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`verifySignature error: ${message}`);
      return { success: false };
    }
  }

  /**
   * Verify a JWT token and return its decoded payload if valid.
   */
  verifyJwt(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}
