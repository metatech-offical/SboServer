import IUser from "../schema";

declare module "socket.io" {
  interface Socket {
    user?: IUser;
  }
}
