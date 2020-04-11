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
npm start
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
- [x] Show feed of user interactions in room
- [X] Current Admin can set new admin for room
- [X] Set username (if nothing entered randomly generated)
- [X] Set roomname (if nothing entered randomly generated)
- [X] Mark which room members have played

## TODO
- [ ] Option to Hide the feed of user actions
- [ ] Option to show the number users played
- [ ] Option to show user name against card played
- [ ] Use toastr alert or similar for certain users actions
- [ ] Change username after entering room
- [ ] Change roomname after room creation
- [ ] Make ui mobile responsive
- [ ] Improve feature to edit task name (also use for room and user names)
