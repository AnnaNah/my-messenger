const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const connectedUsers = new Set();
const typers = new Set();

io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    io.emit('user_count', connectedUsers.size);
    console.log(`👤 Connecté ! Total : ${connectedUsers.size}`);

    socket.on('chat_message', (data) => {
        io.emit('chat_message', { ...data, id: socket.id });
    });

    socket.on('typing', (data) => {
        if (data.isTyping) typers.add(socket.id);
        else typers.delete(socket.id);
        socket.broadcast.emit('user_typing', { isTyping: typers.size > 0 });
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        typers.delete(socket.id);
        // On prévient tout le monde du départ
        io.emit('user_count', connectedUsers.size);
        socket.broadcast.emit('user_typing', { isTyping: typers.size > 0 });
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
});