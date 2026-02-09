import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/environment";

/**
 * Generates a JWT token
 * @param payload - The data to encode in the token
 * @param expiresIn - The token's expiration time (default is '1h')
 * @returns The signed JWT token
 */
export const generateJwtToken = (payload: object, expiresIn: any) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
