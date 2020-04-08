const express = require('express');
const app = express();
const http = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(http);

//global settings
app.locals.title = 'Planning Poker';
const deck = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
const defaultRoom = {
    users: 0,
    played: 0,
    numbers: [],
    host: ''
}
let pokerRooms = {};

//Loads the handlebars module and helpers
const handlebars = require('express-handlebars');

//Use the handlebars engine
app.set('view engine', 'hbs');

//handlebar configs
app.engine('hbs', handlebars({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs',
    defaultLayout: 'homepage'
}));

//access public files
app.use('/', express.static(__dirname + '/public'));

//set tempaltes depending on url
app.get('/', (req, res) => {
    res.render('homepage', { layout: false });
});

app.get('/rooms', (req, res) => {
    res.render('rooms', { layout: 'mainpage' });
});

app.get('/room', (req, res) => {
    res.render('room', { layout: 'mainpage', cards: deck });
});

io.on('connection', function (socket) {

    //connect to a room
    socket.on('connectToRoom', function (room) {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room, function () {
            let isHost = false;
            socket.room = room;
            if (!pokerRooms.hasOwnProperty(room)) {
                pokerRooms[room] = defaultRoom;
                pokerRooms[room].host = socket.id;
                isHost = true;
                roomList(false);
            }
            io.in(room).clients((err, clients) => {
                //console.log(clients);
                pokerRooms[room].users = clients.length;
                //console.log(pokerRooms);
            });
            socket.emit('connectedToRoom', { is_host: isHost, message: 'Welcome ' + socket.id + ', You have connected to room ' + room });
            socket.broadcast.emit('chatMessage', 'Welcome ' + socket.id + ' to the room');
        });

    });

    //get list of rooms on server
    socket.on('getRoomList', function () {
        roomList();
    });

    //when user disconnected (might update number users)
    socket.on('disconnect', function () {
        //console.log('user disconnected id: ' + socket.id);
        io.to(socket.room).emit('chatMessage', socket.id + ' left the room');
    });

    //planning poker functions
    socket.on('pokerPlayed', function (data) {
        let amountPlayed = pokerRooms[data.room].played + 1;
        pokerRooms[data.room].played = amountPlayed;
        pokerRooms[data.room].numbers.push(data.value);
        io.to(data.room).emit('chatMessage', data.user + " played " + data.value);
        //console.log(pokerRooms);
        if (pokerRooms[data.room].played >= pokerRooms[data.room].users) {
            let total = 0;
            for (let i = 0; i < pokerRooms[data.room].numbers.length; i++) {
                total += pokerRooms[data.room].numbers[i];
            }
            let avg = total / pokerRooms[data.room].numbers.length;
            io.to(data.room).emit('chatMessage', "Everyone played " + avg);
            io.to(data.room).emit('pokerReset');
            pokerReset(data.room);
        }
    });

    //chat message function (may remove)
    socket.on('chatMessage', function (data) {
        io.to(data.room).emit('chatMessage', data.message);
    });

    function roomList(userUpdate = true) {
        let rooms = io.sockets.adapter.rooms;
        if(userUpdate) {
            socket.emit('updateRoomList', rooms);
        } else {
            io.emit('updateRoomList', rooms);
        }
    }

});

function pokerReset(room) {
    pokerRooms[room].played = 0;
    pokerRooms[room].numbers = [];
    //console.log(pokerRooms);
}

http.listen(port);