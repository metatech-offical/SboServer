import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config/environment";
import { Socket } from "socket.io";
import { UserService } from "../services";

const authenticateSocket = async (socket: Socket, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;

    if (typeof decoded === "string" || !decoded.email) {
      return next(new Error("Unauthorized"));
    }

    const user = await UserService.getUserByEmail(decoded.email);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};

export default authenticateSocket;
