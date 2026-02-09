import { Namespace, Server } from "socket.io";

import authenticateSocket from "../middlewares/authenticate-socket";

export let streamIO: Namespace;
const mainSocket = (io: Server) => {
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
