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
    res.render('room', { layout: 'mainpage', cards: deck, show_leave: true });
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
                pokerRooms[room] = {
                    name: roomName(roomData.roomname),
                    task: 'New Task',
                    users: {},
                    played: 0,
                    numbers: [],
                    host: socket.id,
                    chatHistory: {}
                };
                socket.is_host = true;
                roomList(false);
            }

            //update amount of users in room
            pokerRooms[room].users[socket.id] = {
                name: socket.username,
                is_host: socket.is_host,
                played: false
            };

            //announce user has joined room
            updateUsers(room);
            chatMessage(room, 'Welcome ' + socket.username + ' to the room', true);
            socket.emit('connectedToRoom', {
                is_host: socket.is_host,
                room: pokerRooms[room],
                message: 'Welcome ' + socket.username + ', You have connected to room ' + pokerRooms[room].name
            });
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
            //remove user from the room
            delete pokerRooms[socket.room].users[socket.id];
            chatMessage(socket.room, socket.username + ' left the room');
            updateUsers(socket.room);

            //if was last user remove room
            let amountUsers = Object.keys(pokerRooms[socket.room].users).length;
            if (amountUsers <= 0) {
                delete pokerRooms[socket.room];
            } else {
                //if user was host set new host
                if (socket.id == pokerRooms[socket.room].host) {
                    setNewHost(socket.room);
                }
            }

            //update room list
            roomList(false);
        }
    });

    //planning poker functions
    socket.on('startPoker', function (data) {
        io.to(data.room).emit('unlockCards');
        chatMessage(data.room, socket.username + " has started a new round for " + pokerRooms[data.room].task);
    });

    socket.on('stopPoker', function () {
        io.to(data.room).emit('lockCards');
    });

    socket.on('restartPoker', function (data) {
        io.to(data.room).emit('lockCards');
        pokerReset(data.room);
        chatMessage(data.room, socket.username + " reset the room");
    });

    socket.on('pokerPlayed', function (data) {
        let amountPlayed = pokerRooms[data.room].played + 1;
        pokerRooms[data.room].played = amountPlayed;
        let amountUsers = Object.keys(pokerRooms[data.room].users).length;
        let percentageComplete = pokerRooms[data.room].played / amountUsers * 100;
        updatePercentage(data.room, percentageComplete);
        pokerRooms[data.room].numbers.push(data.value);

        chatMessage(data.room, socket.username + " played " + data.value);

        if (pokerRooms[data.room].played >= amountUsers) {
            chatMessage(data.room, "Everyone played!");
        }
    });

    socket.on('revealPoker', function (data) {
        let total = 0;
        for (let i = 0; i < pokerRooms[data.room].numbers.length; i++) {
            total += pokerRooms[data.room].numbers[i];
        }
        let avg = total / pokerRooms[data.room].numbers.length;
        chatMessage(data.room, "Revealing the result: " + avg);
        pokerReset(data.room);
    });
1
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
        if (userUpdate) {
            socket.emit('updateRoomList', pokerRooms);
        } else {
            io.emit('updateRoomList', pokerRooms);
        }
    }

    function updateTaskName(room) {
        chatMessage(room, "<strong>" + socket.username + "</strong> update the task name to <strong>" + pokerRooms[room].task + "</strong>");
        io.to(room).emit('updateTaskName', pokerRooms[room].task);
    }

    function updateUsers(room) {
        io.to(room).emit('updateUsers', pokerRooms[room].users);
    }

    function setNewHost(room, hostId) {
        //if there is a host id set it otherwise pick one at random
        if(hostId) {
            //set to the host id
        } else {
            let userObj = Object.keys(pokerRooms[room].users);
            let newHost = userObj[Math.floor(Math.random() * userObj.length)];
            pokerRooms[room].host = newHost;
            pokerRooms[room].users[newHost].is_host = true;
        }
        //chatMessage(room, pokerRooms[room].users[newHost].name + ' is now the host');
        io.to(room).emit('updateUsers', pokerRooms[room].users);
    }

    function updatePercentage(room, percentage) {
        io.to(room).emit('updatePercentage', Math.floor(percentage));
    }

    function pokerReset(room) {
        pokerRooms[room].played = 0;
        pokerRooms[room].numbers = [];
        updatePercentage(room, 0);
    }

});

//global functions
function roomName(roomName) {
    return randomNames.roomnames[Math.floor(Math.random() * randomNames.roomnames.length)].name;
}

function userName(userName) {
    return randomNames.usernames[Math.floor(Math.random() * randomNames.usernames.length)].name;
}

http.listen(port);