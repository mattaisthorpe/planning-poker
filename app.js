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
                    average: 0,
                    users: {},
                    played: 0,
                    numbers: [],
                    host: socket.id,
                    chat_history: []
                };
                socket.is_host = true;
            }

            //update amount of users in room
            pokerRooms[room].users[socket.id] = {
                name: socket.username,
                is_host: socket.is_host,
                played: false
            };

            //announce user has joined room
            updateUsers(room);
            chatMessage(room, 'joined the room');
            roomList(false);
            socket.emit('connectedToRoom', {
                is_host: socket.is_host,
                username: socket.username,
                room: pokerRooms[room],
                message: 'Welcome <strong>' + socket.username + '</strong>, You have connected to room <strong>' + pokerRooms[room].name + '</strong>'
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
            chatMessage(socket.room, 'left the room');
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
        updateCards(data.room);
        chatMessage(data.room, "has started planning for <strong>" + pokerRooms[data.room].task + "</strong>");
    });

    socket.on('stopPoker', function (data) {
        io.to(data.room).emit('lockCards');
        chatMessage(data.room, "stopped the room");
    });

    socket.on('resumePoker', function (data) {
        io.to(data.room).emit('unlockCards');
        chatMessage(data.room, "resumed the room");
    });

    socket.on('restartPoker', function (data) {
        io.to(data.room).emit('lockCards');
        pokerReset(data.room);
        chatMessage(data.room, "reset the room");
    });

    socket.on('pokerPlayed', function (data) {
        let amountPlayed = pokerRooms[data.room].played + 1;
        pokerRooms[data.room].played = amountPlayed;
        let amountUsers = Object.keys(pokerRooms[data.room].users).length;
        let percentageComplete = pokerRooms[data.room].played / amountUsers * 100;
        updatePercentage(data.room, percentageComplete);
        pokerRooms[data.room].numbers.push(data.value);
        updateCards(data.room);

        chatMessage(data.room, "played <strong>" + data.value + "</strong>");

        if (pokerRooms[data.room].played >= amountUsers) {
            io.to(data.room).emit('pokerFinished');
            chatMessage(data.room, "Everyone has played their card!", false);
        }
    });

    socket.on('revealPoker', function (data) {
        let total = 0;
        for (let i = 0; i < pokerRooms[data.room].numbers.length; i++) {
            total += pokerRooms[data.room].numbers[i];
        }
        let average = Math.floor(total / pokerRooms[data.room].numbers.length);
        pokerRooms[data.room].average = average;
        chatMessage(data.room, "is revealing the result...");
        chatMessage(data.room, "The total effort for <strong>" + pokerRooms[data.room].task + "</strong> is <strong>" + average + "</strong>", false);
        revealCards(data.room);
        pokerReset(data.room);
    });
1
    //chat message function (may remove)
    socket.on('chatMessage', function (data) {
        chatMessage(data.room, data.message);
    });

    //global socket functions
    function chatMessage(room, message, appendUsername = true) {
        let messageString = message;
        if (appendUsername) {
            messageString = "<strong>" + socket.username + "</strong> " + message;
        }
        pokerRooms[room].chat_history.push(messageString);
        io.to(room).emit('newChatMessage', messageString);

    }

    function roomList(userUpdate = true) {
        if (userUpdate) {
            socket.emit('updateRoomList', pokerRooms);
        } else {
            io.emit('updateRoomList', pokerRooms);
        }
    }

    function updateTaskName(room) {
        chatMessage(room, "changed the task name to <strong>" + pokerRooms[room].task + "</strong>");
        io.to(room).emit('updateTaskName', pokerRooms[room].task);
    }

    function updateUsers(room) {
        io.to(room).emit('updateUsers', pokerRooms[room].users);
    }

    function setNewHost(room, hostId) {
        let newHost = '';
        //if there is a host id set it otherwise pick one at random
        if(hostId) {
            //set to the host id
        } else {
            let userObj = Object.keys(pokerRooms[room].users);
            newHost = userObj[Math.floor(Math.random() * userObj.length)];
            pokerRooms[room].host = newHost;
            pokerRooms[room].users[newHost].is_host = true;
        }
        chatMessage(room, pokerRooms[room].users[newHost].name + ' is now the host');
        io.to(room).emit('updateUsers', pokerRooms[room].users);
    }

    function updatePercentage(room, percentage) {
        io.to(room).emit('updatePercentage', Math.floor(percentage));
    }

    function updateCards(room) {
        io.to(room).emit('updateCards', pokerRooms[room].numbers);
    }

    function revealCards(room) {
        io.to(room).emit('revealCards', pokerRooms[room].average);
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