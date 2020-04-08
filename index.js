const express = require('express');
const app = express();
const http = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(http);

app.use('/', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

app.get("/rooms", (req, res) => {
    res.sendFile(__dirname + "/views/rooms.html");
});

app.get("/room", (req, res) => {
    res.sendFile(__dirname + "/views/room.html");
});

io.on('connection', function (socket) {

    //connect to a room
    socket.on('connectToRoom', function (room) {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room, function () {
            console.log("Socket now in rooms", socket.rooms);
        });
        socket.room = room;
        socket.emit('connectedToRoom', "You have connected to room " + room);
    });

    //get list of rooms on server
    socket.on('getRoomList', function () {
        let rooms = io.sockets.adapter.rooms;
        socket.emit('updateRoomList', rooms);
    });

    //when user disconnected flag number updates
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    //chat message function to remove
    socket.on('chat message', function (data) {
        io.to(data.room).emit('chat message', data.message);
    });
});

http.listen(port);