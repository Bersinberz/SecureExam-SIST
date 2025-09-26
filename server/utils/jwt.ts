import jwt, { SignOptions } from "jsonwebtoken";
import ms from "ms";

const JWT_SECRET = process.env.JWT_SECRET || "fallbackSecret";

interface JwtPayload {
  userId: string;
  userType: string;
  email?: string;
  registerNumber?: number;
}

export const createToken = (payload: JwtPayload, expiresIn: string = "1h"): string => {
  const expires = ms(expiresIn as ms.StringValue);
  const options: SignOptions = { expiresIn: (expires! / 1000) as number };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
};