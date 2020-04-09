const express = require('express');
const handlebars = require('express-handlebars');
const app = express();
const http = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(http);
const randomNames = require('./config/randomnames');

//global settings
app.locals.title = 'Planning Poker';
const deck = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];
const defaultRoom = {
    name: '',
    task: '',
    users: {},
    played: 0,
    numbers: [],
    host: '',
    chatHistory: {}
}
let pokerRooms = {};

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
    socket.on('connectToRoom', function (roomData) {
        const room = roomData.hash;
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room, function () {
            socket.isHost = false;
            socket.room = room;
            socket.username = userName(roomData.username);

            //create a default room if one isn't made
            if (!pokerRooms.hasOwnProperty(room)) {
                console.log('Creating new room' + room);
                pokerRooms[room] = defaultRoom;
                pokerRooms[room].host = socket.id;
                pokerRooms[room].name = roomName(roomData.roomname);
                socket.isHost = true;
                roomList(false);
            }

            //update amount of users in room
            pokerRooms[room].users[socket.id] = {
                name: socket.username, 
                is_host: socket.isHost,
                played: false
            };

            //announce user has joined room
            updateUsers(room);
            chatMessage(room, 'Welcome ' + socket.username + ' to the room', true);
            socket.emit('connectedToRoom', { is_host: socket.isHost, room: pokerRooms[room], message: 'Welcome ' + socket.username + ', You have connected to room ' + pokerRooms[room].name });
        });

    });

    //get list of rooms on server
    socket.on('getRoomList', function () {
        roomList();
    });

    //change name of task
    socket.on('changeTaskName', function (data) {
        pokerRooms[data.room].task = data.name;
        updateTaskName(data.room);
    });

    //when user disconnected (might update number users)
    socket.on('disconnect', function () {
        if (pokerRooms.hasOwnProperty(socket.room)) {
            //TODO delete room fom json if zero users.
            delete pokerRooms[socket.room].users[socket.id];
            chatMessage(socket.room, socket.username + ' left the room');
            updateUsers(socket.room);
        }
    });

    //planning poker functions
    socket.on('pokerPlayed', function (data) {
        if (pokerRooms[data.room].played) {
            chatMessage(data.room, socket.username + " has started a new round for " + pokerRooms[data.room].task);
        }

        let amountPlayed = pokerRooms[data.room].played + 1;
        pokerRooms[data.room].played = amountPlayed;
        pokerRooms[data.room].numbers.push(data.value);
        chatMessage(data.room, socket.username + " played " + data.value);

        console.log(pokerRooms);
        console.log(pokerRooms[data.room].users[socket.id]);
        console.log(Object.keys(pokerRooms[data.room].users).length);

        if (pokerRooms[data.room].played >= Object.keys(pokerRooms[data.room].users).length) {
            let total = 0;
            for (let i = 0; i < pokerRooms[data.room].numbers.length; i++) {
                total += pokerRooms[data.room].numbers[i];
            }
            let avg = total / pokerRooms[data.room].numbers.length;
            chatMessage(data.room, "Everyone played! The result: " + avg);
            io.to(data.room).emit('pokerReset');
            pokerReset(data.room);
        }
    });

    //chat message function (may remove)
    socket.on('chatMessage', function (data) {
        chatMessage(data.room, data.message);
    });

    //global socket functions
    function chatMessage(room, message, ignoreUser = false) {
        if (ignoreUser) {
            socket.broadcast.to(room).emit('newChatMessage', message);
        } else {
            io.to(room).emit('newChatMessage', message);
        }
    }

    function roomList(userUpdate = true) {
        console.log(pokerRooms);
        if(userUpdate) {
            socket.emit('updateRoomList', pokerRooms);
        } else {
            io.emit('updateRoomList', pokerRooms);
        }
    }

    function updateTaskName(room) {
        chatMessage(room, "<strong>" + socket.username + "</strong> update the task name to <strong>" + pokerRooms[room].task + "</strong>" );
        io.to(room).emit('updateTaskName', pokerRooms[room].task);
    }

    function updateUsers(room) {
        io.to(room).emit('updateUsers', pokerRooms[room].users);
    }

});

//global functions
function pokerReset(room) {
    pokerRooms[room].played = 0;
    pokerRooms[room].numbers = [];
    //console.log(pokerRooms);
}

function roomName(roomName) {
    return  randomNames.roomnames[Math.floor(Math.random() * randomNames.roomnames.length)].name;
}

function userName(userName) {
    return  randomNames.usernames[Math.floor(Math.random() * randomNames.usernames.length)].name;
}

http.listen(port);