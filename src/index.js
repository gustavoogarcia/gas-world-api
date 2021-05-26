const express = require('express');
const http = require('http');
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const sockets = socketio(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.static('public'));
server.listen(3001, () => console.log(`server listening`))

const gameState = { screen: { x: 400, y: 400 }, players: {} }

const acceptedMoves = { 
  ArrowLeft: (player) => ({ x: Math.max(player.x - 20, 0), y: player.y }),
  ArrowUp: (player) => ({ y: Math.max(player.y - 20, 0), x: player.x }), 
  ArrowDown: (player, screen) => ({ y: Math.min(player.y + 20, screen.y - 20), x: player.x }),
  ArrowRight: (player, screen) =>  ({ x: Math.min(player.x + 20, screen.x - 20), y: player.y }) 
};

const addPlayer = (id) => gameState.players[id] = { id, x: 0, y: 0};
const removePlayer = (id) => delete gameState.players[id];
const movePlayer = (id, nextPlayerPosition) => gameState.players[id] = { ...gameState.players[id], ...nextPlayerPosition };

const observers = {};
const subscribe = (socket) => observers[socket.id] = socket;
const unsubscribe = (id) => delete observers[id];
const notifyAll = (command, payload) => Object.values(observers).forEach((socket) => socket.emit(command, payload));


sockets.on('connect', (socket) => {
  const { id } = socket;
  subscribe(socket);
  socket.emit('gameInitiated', { gameState, id });
  addPlayer(id);
  notifyAll('playerAdded', { gameState });
  
  socket.on('playerMove', ({ key }) => {
    const nextPlayerPosition = acceptedMoves[key] && acceptedMoves[key](gameState.players[socket.id], gameState.screen);
    movePlayer(socket.id, nextPlayerPosition);
    notifyAll('playerMoved', { gameState });
  });

  socket.on('disconnect', () => {
    removePlayer(id)
    unsubscribe(id);
    notifyAll('playerRemoved', { gameState });
  });
});
