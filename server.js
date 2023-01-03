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
io.of('/').use((socket, next) => {
   io.of('/socket').use((socket, next) => {
      next();
   });
    next(new Error("thou shall not pass"));
});
io.of('/socket').use((socket, next) => {
    console.log(socket);
    const token = socket.handshake.query.token;
    jwt.verify(token, secret, function(err, decoded) {
        if (err) {
            next(new Error("thou shall not pass"));
        } else {
            decoded.jwtToken = token;
            sockets[socket.id] = decoded;
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
    socket.on("chat-message", (socketMessage) => {
        console.log("new message");
        let message = socketMessage.message;
        let chatId = socketMessage.chat_id;
        socket.to(chatId).emit("chat-message", message);
        let token = sockets[socket.id].jwtToken;
        let body = {
            message: message,
            message_type: 1,
            chat_id: chatId
        }
        let url = apiURL + 'message';
        let config = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        axios.post(url, body, config)
    });

    // Runs when client disconnects
    socket.on("disconnect", () => {
        delete sockets[socket.id];
    });
});

const PORT = process.env.PORT

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));