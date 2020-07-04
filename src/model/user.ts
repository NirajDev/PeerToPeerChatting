export class User {
    socketId: string;
    username: string;

    constructor(socketId, username) {
        this.socketId = socketId;
        this.username = username;
    }
}