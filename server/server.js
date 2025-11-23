const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ChessGame = require('./chess-game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Almacenamiento de partidas
const games = new Map();

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Crear nueva partida
  socket.on('createGame', (timeControl) => {
    const gameId = generateGameId();
    const game = new ChessGame(timeControl);
    games.set(gameId, game);
    
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, color: 'white' });
    console.log(`Partida creada: ${gameId}`);
  });

  // Unirse a partida existente
  socket.on('joinGame', (gameId) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', 'Partida no encontrada');
      return;
    }
    
    if (game.players.black) {
      socket.emit('error', 'La partida está llena');
      return;
    }
    
    game.players.black = socket.id;
    socket.join(gameId);
    socket.emit('gameJoined', { gameId, color: 'black' });
    
    // Notificar a ambos jugadores que la partida puede comenzar
    io.to(gameId).emit('gameStart', {
      board: game.getBoard(),
      currentTurn: game.currentTurn,
      whiteTime: game.whiteTime,
      blackTime: game.blackTime
    });
    
    console.log(`Jugador se unió a partida: ${gameId}`);
  });

  // Manejar movimiento de pieza
  socket.on('movePiece', (data) => {
    const { gameId, from, to } = data;
    const game = games.get(gameId);
    
    if (!game || !game.isPlayerInGame(socket.id)) {
      socket.emit('error', 'Movimiento inválido');
      return;
    }
    
    const moveResult = game.makeMove(from, to, socket.id);
    
    if (moveResult.valid) {
      // Actualizar tiempo del jugador que acaba de mover
      game.updateTime(socket.id, data.timeSpent);
      
      // Enviar actualización a ambos jugadores
      io.to(gameId).emit('moveMade', {
        board: game.getBoard(),
        from,
        to,
        currentTurn: game.currentTurn,
        whiteTime: game.whiteTime,
        blackTime: game.blackTime,
        gameOver: moveResult.gameOver,
        winner: moveResult.winner
      });
      
      // Iniciar temporizador para el siguiente jugador
      if (!moveResult.gameOver) {
        game.startTimer(socket.id, (timeUpdate) => {
          io.to(gameId).emit('timeUpdate', timeUpdate);
          
          // Verificar si el tiempo se agotó
          if (timeUpdate.gameOver) {
            io.to(gameId).emit('gameOver', {
              winner: timeUpdate.winner,
              reason: 'time'
            });
          }
        });
      }
    } else {
      socket.emit('invalidMove', { reason: moveResult.reason });
    }
  });

  // Manejar pausa/reanudación del tiempo
  socket.on('pauseGame', (gameId) => {
    const game = games.get(gameId);
    if (game) {
      game.pauseTimers();
      io.to(gameId).emit('gamePaused');
    }
  });

  socket.on('resumeGame', (gameId) => {
    const game = games.get(gameId);
    if (game) {
      const currentPlayer = game.currentTurn === 'white' ? game.players.white : game.players.black;
      game.startTimer(currentPlayer, (timeUpdate) => {
        io.to(gameId).emit('timeUpdate', timeUpdate);
        
        if (timeUpdate.gameOver) {
          io.to(gameId).emit('gameOver', {
            winner: timeUpdate.winner,
            reason: 'time'
          });
        }
      });
      io.to(gameId).emit('gameResumed');
    }
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    
    // Buscar y limpiar partidas donde estaba este jugador
    for (const [gameId, game] of games.entries()) {
      if (game.players.white === socket.id || game.players.black === socket.id) {
        io.to(gameId).emit('playerDisconnected');
        games.delete(gameId);
        break;
      }
    }
  });
});

// Función para generar ID de partida
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});