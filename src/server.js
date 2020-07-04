"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const user_1 = require("./model/user");
class Server {
    constructor() {
        this.activeSockets = [];
        this.DEFAULT_PORT = process.env.PORT || 1000;
        this.initialize();
    }
    initialize() {
        this.app = express_1.default();
        this.httpServer = http_1.createServer(this.app);
        this.io = socket_io_1.default(this.httpServer);
        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }
    configureApp() {
        this.app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
    }
    configureRoutes() {
        this.app.get("/", (req, res) => {
            res.sendFile("index.html");
        });
    }
    handleSocketConnection() {
        this.io.on("connection", (socket) => {
            console.log('count ', this.activeSockets.length);
            let userToAdd = new user_1.User(socket.id, '');
            this.activeSockets.push(userToAdd);
            // const existingSocket = this.activeSockets.find(
            //   existingSocket => existingSocket.socketId === socket.id
            // );
            // if (!existingSocket) {
            // let user: User = new User(socket.id, 'user');
            // this.activeSockets.push(user);
            // console.log('on connect user will get this, ', this.activeSockets.filter(
            //   s => s.socketId !== socket.id
            // ));
            // socket.emit("update-user-list", {
            //   users: this.activeSockets.filter(
            //     s => s.socketId !== socket.id
            //   )
            // });
            // console.log('other user will get my details, ', new User(socket.id, user.username));
            // for other users to show the list of updated list of online users
            // socket.broadcast.emit("add-user-list", {
            //   users: [new User(socket.id, user.username)]
            // });
            // }
            socket.on("add-user", (user) => {
                console.log('user add user ', user);
                // for other users to show the list of updated list of online users
                // socket['username'] = user.username;                
                let currentUserIndex = this.activeSockets.findIndex(x => x.socketId == socket.id);
                this.activeSockets[currentUserIndex].username = user.username;
                // this.activeSockets.forEach(x => {
                //   console.log("this.activeSockets---", x);
                // });
                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(s => (s.socketId !== socket.id && s.username != ''))
                });
                socket.broadcast.emit("add-user-list", {
                    users: this.activeSockets.filter(s => (s.socketId === socket.id && s.username != ''))
                });
            });
            socket.on("call-user", (data) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on("reject-call", data => {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });
            socket.on("disconnect", () => {
                console.log('disconnect ', socket.id);
                this.activeSockets = this.activeSockets.filter(existingSocket => existingSocket.socketId !== socket.id);
                // console.log("disconnect");
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });
        });
    }
    listen(callback) {
        this.httpServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}
exports.Server = Server;
