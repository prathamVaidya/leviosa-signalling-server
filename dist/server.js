"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const { instrument } = require("@socket.io/admin-ui");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
var os = require("os");
dotenv_1.default.config();
const app = (0, express_1.default)();
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
io.sockets.on("connection", function (socket) {
    function log(...args) {
        var array = ["Message from server:"];
        array.push.apply(array, args);
        socket.emit("log", array);
        console.log(args.toString());
    }
    //Defining Socket Connections
    socket.on("message", function (message, room) {
        log("Client said: ", message);
        // for a real app, would be room-only (not broadcast)
        socket.in(room).emit("message", message, room);
    });
    socket.on("create or join", function (room) {
        log("Received request to create or join room " + room);
        var clientsInRoom = socket.adapter.rooms.get(room);
        var numClients = clientsInRoom ? clientsInRoom.size : 0;
        log("Room " + room + " now has " + numClients + " client(s)");
        if (numClients === 0) {
            socket.join(room);
            log("Client ID " + socket.id + " created room " + room);
            socket.emit("created", room, socket.id);
        }
        else if (numClients === 1) {
            log("Client ID " + socket.id + " joined room " + room);
            io.sockets.in(room).emit("join", room);
            socket.join(room);
            socket.emit("joined", room, socket.id);
            io.sockets.in(room).emit("ready");
        }
        else {
            // max two clients
            socket.emit("full", room);
        }
    });
    socket.on("ipaddr", function () {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function (details) {
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
