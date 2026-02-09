import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { JWT_SECRET } from "../config/environment";
import { UserService } from "../services";

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  jwt.verify(token, JWT_SECRET, async (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
    if (err) {
      return res.status(401).send("Unauthorized");
    }

    if (!decoded || typeof decoded === "string" || !decoded.email) {
      return res.status(401).send("Unauthorized");
    }

    const user = await UserService.getUserByEmail(decoded.email);

    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    req.user = user;
    next();
  });
};

export default authenticate;
