import { Injectable } from '@nestjs/common';

import { verifyMessage as verifyMessageUnsafe } from 'ethers';

export interface VerifyResult {
  ok: boolean;
  recovered?: string;
  error?: string;
}

// Explicitly declare verifyMessage as a known, typed function
const verifyMessage: (message: string, signature: string) => string =
  verifyMessageUnsafe as unknown as (
    message: string,
    signature: string,
  ) => string;

@Injectable()
export class CryptoUtils {
  /**
   * Builds a deterministic message that the wallet signs.
   */
  buildMessage(address: string, nonce: string, timestamp?: string): string {
    const ts: string = timestamp ?? Date.now().toString();
    return (
      `Welcome to RYTExplorer!\n\n` +
      `Wallet: ${address}\n` +
      `Nonce: ${nonce}\n` +
      `Timestamp: ${ts}\n\n` +
      `Sign this message to authenticate with RYTExplorer.`
    );
  }

  /**
   * Verifies that a given signature matches the provided message.
   */
  verifySignature(message: string, signature: string): VerifyResult {
    try {
      const recovered: string = verifyMessage(message, signature);
      return { ok: true, recovered };
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown verification error';
      return { ok: false, error: errMsg };
    }
  }

  /**
   * Generates a cryptographically strong random nonce (string).
   */
  generateNonce(): string {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0].toString();
  }
}
