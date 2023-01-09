require("dotenv").config();
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const axios = require('axios');

const http = require("http");
const express = require("express");
const socketio = require("socket.io");

const apiURL = process.env.API_URL;
const app = express();
const server = http.createServer(app);
const io = socketio(server);
var sockets = []
var userSocket = []

let socketEventNewMessage = "chat-message";
let socketEventNewChat = "new-chat";


io.of('/').use((socket, next) => {
    io.of('/socket').use((socket, next) => {
        next();
    });
    next(new Error("Unauthorized"));
});
io.of('/socket').use((socket, next) => {
    const token = socket.handshake.auth.token;
    jwt.verify(token, secret, function (err, decoded) {
        if (err) {
            next(new Error("Unauthorized"));
        } else {
            decoded.jwtToken = token;
            sockets[socket.id] = decoded;

            decoded.socketId = socket.id;
            userSocket[decoded.id] = socket;

            next();
        }
    });
});

io.of('/socket').on("connection", (socket) => {
    let user = sockets[socket.id]
    let userChatIds = user.chats;

    if (Array.isArray(userChatIds)) {
        socket.join(userChatIds);
    }
    socket.on(socketEventNewMessage, (socketMessage) => {
        let message = socketMessage.message;
        let chatId = socketMessage.chat_id;

        let token = sockets[socket.id].jwtToken;
        let url = apiURL + 'message';
        let config = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        let body = {
            message: message,
            message_type: 1,
            chat_id: chatId,
            sender_user_id: user.id,
        }
        socket.to(chatId).emit(socketEventNewMessage, body);
        axios.post(url, body, config);
    });
    socket.on(socketEventNewChat, (socketMessage) => {
        let message = socketMessage.message;
        let chatId = socketMessage.chat_id;

        let token = sockets[socket.id].jwtToken;
        let url = apiURL + 'message';
        let config = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        let body = {
            message: message,
            message_type: 1,
            chat_id: chatId,
            sender_user_id: user.id,
            chat_name: socketMessage.chat_name
        }
        socket.join(chatId);
        let recipientId = socketMessage.recipient_user_id;
        if (userSocket[recipientId] != undefined) {
            userSocket[recipientId].join(chatId);
        }
        socket.to(chatId).emit(socketEventNewChat, body);
        axios.post(url, body, config);
    });
    socket.on("disconnect", () => {
        delete sockets[socket.id];
    });
});

const PORT = process.env.PORT

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));