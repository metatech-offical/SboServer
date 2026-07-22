import { Namespace, Server } from "socket.io";

import authenticateSocket from "../middlewares/authenticate-socket";

export let streamIO: Namespace;
export let mainIO: Server;

const mainSocket = (io: Server) => {
  mainIO = io;
  streamIO = io.of("/stream");

  streamIO.use(authenticateSocket);

  streamIO.on("connection", (socket) => {
    console.log("User connected", socket.user.username);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

export default mainSocket;
