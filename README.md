# planning-poker
Built on Socket.io, planning-poker was created to allow real-time project planning in a digital environment.

![Planning Poker Screenshot](https://matthewaisthorpe.com.au/wp-content/uploads/2020/04/planning-poker-screenshot.jpg)

## What is planning poker
Check out https://en.wikipedia.org/wiki/Planning_poker

## Prerequisites
1. Node.JS 12 + NPM 

## Installation

1. Clone this repo

```bash
git clone https://github.com/mattaisthorpe/planning-poker.git
cd planning-poker
``` 

2. Install dependancies

```bash
npm install
```
     
3. Run the app

```bash
node app.js
```

## Features

- [x] Create and Join planning rooms
- [x] Admin controls (start, reset, reveal)
- [x] Show progress of cards submitted
- [x] Reveal cards once all submitted
- [x] Reveal estimated effort once all submitted
- [x] Edit task name
- [x] Log of all user interactions with room
- [x] Generate unique room id and url
- [x] List available rooms to join
- [x] Send messages room
- [ ] Set new admin for room
- [ ] Edit username (current randomly generated)
- [ ] Edit roomname (current randomly generated)
- [ ] Use toastr like alert for certain messages
- [ ] Add some icons around the place
- [ ] Mark which users have played
- [ ] Make mobile responsive
