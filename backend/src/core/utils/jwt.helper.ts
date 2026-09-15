// ─────────────────────────────────────────────────────────────────────────────
// core/utils/jwt.helper.ts
// Centralised JWT sign / verify logic.
//
// verifyToken is async — uses the callback-based jwt.verify under the hood
// so the crypto work doesn't block the Node.js event loop under high concurrency.
// ─────────────────────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { StringValue } from 'ms';

export function signToken(
  payload: object,
  secret: string,
  expiresIn: StringValue
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string, secret: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}
