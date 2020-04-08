const express = require('express');
const app = express();
const http = require('http').createServer(app);
const port = 3000;
const io = require('socket.io')(http);

//Loads the handlebars module
const handlebars = require('express-handlebars');

//Use the handlebars engine
app.set('view engine', 'hbs');

//Sets handlebars configurations (we will go through them later on)
app.engine('hbs', handlebars({
    layoutsDir: __dirname + '/views/layouts',
    extname: 'hbs',
    defaultLayout: 'homepage',
}));

app.use('/', express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
    res.render('homepage', { layout: false });
});

app.get('/rooms', (req, res) => {
    //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
    res.render('rooms', { layout: 'mainpage' });
});

app.get('/room', (req, res) => {
    //Serves the body of the page aka "main.handlebars" to the container //aka "index.handlebars"
    res.render('room', { layout: 'mainpage' });
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