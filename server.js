const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const mongoURI = process.env.MONGO_URL;

mongoose.connect(mongoURI)
.then(() => console.log('Connexion à MongoDB réussie !'))
.catch(err => console.error('Erreur de connexion à MongoDB :', err));

const messageSchema = new mongoose.Schema({
    text: String,
    sender: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const connectedUsers = new Set();
const typers = new Set();

io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    io.emit('user_count', connectedUsers.size);
    console.log(`👤 Connecté ! Total : ${connectedUsers.size}`);

    Message.find().sort({ timestamp: -1 }).limit(50).then(messages => {
        socket.emit('previous_messages', messages.reverse());
    });
    
    socket.on('chat_message', async (data) => {
        // 1. On crée le message avec les données reçues
        const newMessage = new Message({
            text: data.message,
            sender: data.name
        });

        try {
            // 2. On l'enregistre dans la base de données
            await newMessage.save();
            
            // 3. UNE FOIS ENREGISTRÉ, on l'envoie à tout le monde
            io.emit('chat_message', { ...data, id: socket.id });
        } catch (err) {
            console.error("Erreur lors de l'enregistrement :", err);
        }
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