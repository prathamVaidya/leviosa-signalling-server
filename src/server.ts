import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

const { instrument } = require("@socket.io/admin-ui");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
var os = require("os");

dotenv.config();

const app: Express = express();

app.use(cors({ origin: "*" }));

const port = process.env.PORT;

var server = http.createServer(app);

server.listen(port);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

instrument(io, { auth: false });

io.sockets.on("connection", function (socket: any) {
  function log(...args: string[]) {
    var array = ["Message from server:"];
    array.push.apply(array, args);
    socket.emit("log", array);
    console.log(args.toString());
  }

  //Defining Socket Connections
  socket.on("message", function (message: string, room: string) {
    log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.in(room).emit("message", message, room);
  });

  socket.on("create or join", function (room: string) {
    log("Received request to create or join room " + room);

    var clientsInRoom = socket.adapter.rooms.get(room);

    var numClients = clientsInRoom ? clientsInRoom.size : 0;

    log("Room " + room + " now has " + numClients + " client(s)");

    if (numClients === 0) {
      socket.join(room);
      log("Client ID " + socket.id + " created room " + room);
      socket.emit("created", room, socket.id);
    } else if (numClients === 1) {
      log("Client ID " + socket.id + " joined room " + room);
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");
    } else {
      // max two clients
      socket.emit("full", room);
    }
  });

  socket.on("ipaddr", function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details: any) {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });

  socket.on("bye", function () {
    console.log("received bye");
  });
});
