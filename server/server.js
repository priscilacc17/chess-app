const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { ChessGame, generateGameId } = require('./server-core');

// Crear app Express y servidor HTTP (siempre disponibles)
const app = express();
const server = http.createServer(app);

// Detectar modo test de manera robusta
const isTestMode = process.env.NODE_ENV === 'test' || 
                  process.argv.some(arg => arg.includes('jest'));

console.log(`Modo: ${isTestMode ? 'TEST' : 'PRODUCCIÓN'}`);

// Configuración de Socket.io (condicional)
let io;
if (!isTestMode) {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
} else {
  // Mock completo para tests
  io = {
    on: () => io,
    to: () => ({ emit: () => {} }),
    emit: () => {},
    sockets: { emit: () => {} }
  };
}

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '../public')));

// Almacenamiento (siempre disponible para tests)
const games = new Map();
const playerSessions = new Map();

// Rutas HTTP (siempre disponibles)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), mode: isTestMode ? 'test' : 'production' });
});

// Socket handlers (solo en modo producción)
function setupSocketHandlers() {
  if (isTestMode) return;

  io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Recuperar sesión existente
    socket.on('restoreSession', (data) => {
      const { playerId, gameId } = data;
      const game = games.get(gameId);
      
      if (game && game.isPlayerInGame(playerId)) {
        playerSessions.set(playerId, socket.id);
        socket.join(gameId);
        
        const playerColor = game.getPlayerColor(playerId);
        socket.emit('sessionRestored', {
          gameId,
          color: playerColor,
          gameState: game.getGameState()
        });
        
        socket.to(gameId).emit('playerReconnected', { color: playerColor });
      } else {
        socket.emit('error', 'No se pudo restaurar la sesión');
      }
    });

    // Crear nueva partida
    socket.on('createGame', (data) => {
      try {
        const { timeControl, playerId } = data;
        const gameId = generateGameId();
        const game = new ChessGame(timeControl, gameId);
        
        const color = game.addPlayer(socket.id, playerId, 'white');
        games.set(gameId, game);
        playerSessions.set(playerId, socket.id);
        
        socket.join(gameId);
        socket.emit('gameCreated', { 
          gameId, 
          color,
          playerId 
        });
        
        console.log(`Partida creada: ${gameId} por jugador ${playerId}`);
      } catch (error) {
        console.error('Error creando partida:', error);
        socket.emit('error', 'Error al crear la partida');
      }
    });

    // Unirse a partida existente
    // En server.js, modifica el handler de joinGame:

    socket.on('joinGame', (data) => {
        try {
            const { gameId, playerId } = data;
            const game = games.get(gameId);
            
            if (!game) {
                socket.emit('error', 'Partida no encontrada');
                return;
            }
            
            if (game.started) {
                socket.emit('error', 'La partida ya comenzó');
                return;
            }
            
            const color = game.addPlayer(socket.id, playerId);
            if (!color) {
                socket.emit('error', 'La partida está llena');
                return;
            }
            
            playerSessions.set(playerId, socket.id);
            socket.join(gameId);
            socket.emit('gameJoined', { 
                gameId, 
                color,
                playerId 
            });
            
            // Configurar el callback de actualización de tiempo - ESTA ES LA CLAVE
            game.onTimeUpdate = (timeUpdate) => {
                io.to(gameId).emit('timeUpdate', timeUpdate);
                
                if (timeUpdate.gameOver) {
                    io.to(gameId).emit('gameOver', {
                        winner: timeUpdate.winner,
                        reason: 'time'
                    });
                    game.clock.stopTimers();
                }
            };
            
            // Si el juego ya empezó, configurar el callback en el reloj también
            if (game.started) {
                game.clock.onTimeUpdate = game.onTimeUpdate;
            }
            
            // Notificar inicio de partida
            io.to(gameId).emit('gameStart', game.getGameState());
            console.log(`Jugador ${playerId} se unió a partida: ${gameId} como ${color}`);
        } catch (error) {
            console.error('Error uniéndose a partida:', error);
            socket.emit('error', 'Error al unirse a la partida');
        }
    });

    // Manejar movimiento de pieza
    socket.on('movePiece', (data) => {
      try {
        const { gameId, from, to, promotion, playerId } = data;
        const game = games.get(gameId);
        
        if (!game || !game.isPlayerInGame(playerId)) {
          socket.emit('error', 'Movimiento inválido');
          return;
        }
        
        const moveResult = game.makeMove(from, to, promotion, playerId);
        
        if (moveResult.valid) {
          // Enviar actualización a ambos jugadores
          io.to(gameId).emit('moveMade', {
            ...moveResult,
            ...game.getGameState()
          });
          
          // Manejar fin del juego
          if (moveResult.gameOver) {
            game.clock.stopTimers();
            io.to(gameId).emit('gameOver', {
              winner: moveResult.winner,
              reason: moveResult.reason
            });
            
            // Limpiar partida después de un tiempo
            setTimeout(() => {
              games.delete(gameId);
            }, 30000); // 30 segundos
          }
        } else {
          socket.emit('invalidMove', { reason: moveResult.reason });
        }
      } catch (error) {
        console.error('Error en movimiento:', error);
        socket.emit('error', 'Error procesando el movimiento');
      }
    });

    // Obtener movimientos válidos
    socket.on('getValidMoves', (data) => {
      try {
        const { gameId, position, playerId } = data;
        const game = games.get(gameId);
        
        if (game && game.isPlayerInGame(playerId)) {
          const validMoves = game.getAllValidMoves();
          socket.emit('validMoves', { 
            position, 
            moves: validMoves[position] || [] 
          });
        } else {
          socket.emit('error', 'No se pueden obtener movimientos válidos');
        }
      } catch (error) {
        console.error('Error obteniendo movimientos válidos:', error);
        socket.emit('error', 'Error obteniendo movimientos válidos');
      }
    });

    // Manejar pausa del juego
    socket.on('pauseGame', (gameId) => {
      try {
        const game = games.get(gameId);
        if (game) {
          game.clock.stopTimers();
          io.to(gameId).emit('gamePaused');
        }
      } catch (error) {
        console.error('Error pausando juego:', error);
      }
    });

    // Manejar reanudación del juego
    socket.on('resumeGame', (gameId) => {
      try {
        const game = games.get(gameId);
        if (game && !game.gameOver) {
          game.clock.startTimer(game.clock.currentTurn, (timeUpdate) => {
            io.to(gameId).emit('timeUpdate', timeUpdate);
          });
          io.to(gameId).emit('gameResumed');
        }
      } catch (error) {
        console.error('Error reanudando juego:', error);
      }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('Usuario desconectado:', socket.id);
      
      // Buscar jugador desconectado
      for (const [playerId, socketId] of playerSessions.entries()) {
        if (socketId === socket.id) {
          playerSessions.delete(playerId);
          
          // Notificar partidas donde estaba este jugador
          for (const [gameId, game] of games.entries()) {
            if (game.isPlayerInGame(playerId)) {
              const color = game.getPlayerColor(playerId);
              socket.to(gameId).emit('playerDisconnected', { color });
              
              // Limpiar partida si ambos jugadores se desconectan
              setTimeout(() => {
                if (games.has(gameId)) {
                  games.delete(gameId);
                  console.log(`Partida ${gameId} eliminada por inactividad`);
                }
              }, 60000); // 1 minuto
              break;
            }
          }
          break;
        }
      }
    });
  });
}

// Inicializar socket handlers
setupSocketHandlers();

// Iniciar servidor (solo en modo producción)
function startServer() {
  if (!isTestMode) {
    server.listen(PORT, () => {
      console.log(`Servidor ejecutándose en puerto ${PORT}`);
    });
  } else {
    console.log('Modo test - Servidor HTTP configurado sin iniciar');
  }
}

// Función para detener el servidor (útil para tests)
function stopServer(callback) {
  if (server.listening) {
    server.close(() => {
      console.log('Servidor detenido');
      if (callback) callback();
    });
  } else {
    if (callback) callback();
  }
}

// Iniciar el servidor automáticamente en modo producción
startServer();

// Función para obtener socket handlers (para testing)
function getSocketHandlers() {
  return {
    restoreSession: (socket, data) => {
      const { playerId, gameId } = data;
      const game = games.get(gameId);
      
      if (game && game.isPlayerInGame(playerId)) {
        playerSessions.set(playerId, socket.id);
        socket.join(gameId);
        
        const playerColor = game.getPlayerColor(playerId);
        socket.emit('sessionRestored', {
          gameId,
          color: playerColor,
          gameState: game.getGameState()
        });
        
        socket.to(gameId).emit('playerReconnected', { color: playerColor });
      } else {
        socket.emit('error', 'No se pudo restaurar la sesión');
      }
    },

    createGame: (socket, data) => {
      try {
        const { timeControl, playerId } = data;
        const gameId = generateGameId();
        const game = new ChessGame(timeControl, gameId);
        
        const color = game.addPlayer(socket.id, playerId, 'white');
        games.set(gameId, game);
        playerSessions.set(playerId, socket.id);
        
        socket.join(gameId);
        socket.emit('gameCreated', { 
          gameId, 
          color,
          playerId 
        });
        
        console.log(`Partida creada: ${gameId} por jugador ${playerId}`);
      } catch (error) {
        console.error('Error creando partida:', error);
        socket.emit('error', 'Error al crear la partida');
      }
    },

    joinGame: (socket, data) => {
      try {
        const { gameId, playerId } = data;
        const game = games.get(gameId);
        
        if (!game) {
          socket.emit('error', 'Partida no encontrada');
          return;
        }
        
        if (game.started) {
          socket.emit('error', 'La partida ya comenzó');
          return;
        }
        
        const color = game.addPlayer(socket.id, playerId);
        if (!color) {
          socket.emit('error', 'La partida está llena');
          return;
        }
        
        playerSessions.set(playerId, socket.id);
        socket.join(gameId);
        socket.emit('gameJoined', { 
          gameId, 
          color,
          playerId 
        });
        
        // Configurar el callback de actualización de tiempo
        game.clock.onTimeUpdate = (timeUpdate) => {
          io.to(gameId).emit('timeUpdate', timeUpdate);
          
          if (timeUpdate.gameOver) {
            io.to(gameId).emit('gameOver', {
              winner: timeUpdate.winner,
              reason: 'time'
            });
            game.clock.stopTimers();
          }
        };
        
        // Notificar inicio de partida
        io.to(gameId).emit('gameStart', game.getGameState());
        console.log(`Jugador ${playerId} se unió a partida: ${gameId} como ${color}`);
      } catch (error) {
        console.error('Error uniéndose a partida:', error);
        socket.emit('error', 'Error al unirse a la partida');
      }
    },

    movePiece: (socket, data) => {
      try {
        const { gameId, from, to, promotion, playerId } = data;
        const game = games.get(gameId);
        
        if (!game || !game.isPlayerInGame(playerId)) {
          socket.emit('error', 'Movimiento inválido');
          return;
        }
        
        const moveResult = game.makeMove(from, to, promotion, playerId);
        
        if (moveResult.valid) {
          // Enviar actualización a ambos jugadores
          io.to(gameId).emit('moveMade', {
            ...moveResult,
            ...game.getGameState()
          });
          
          // Manejar fin del juego
          if (moveResult.gameOver) {
            game.clock.stopTimers();
            io.to(gameId).emit('gameOver', {
              winner: moveResult.winner,
              reason: moveResult.reason
            });
            
            // Limpiar partida después de un tiempo
            setTimeout(() => {
              games.delete(gameId);
            }, 30000); // 30 segundos
          }
        } else {
          socket.emit('invalidMove', { reason: moveResult.reason });
        }
      } catch (error) {
        console.error('Error en movimiento:', error);
        socket.emit('error', 'Error procesando el movimiento');
      }
    },

    getValidMoves: (socket, data) => {
      try {
        const { gameId, position, playerId } = data;
        const game = games.get(gameId);
        
        if (game && game.isPlayerInGame(playerId)) {
          const validMoves = game.getAllValidMoves();
          socket.emit('validMoves', { 
            position, 
            moves: validMoves[position] || [] 
          });
        } else {
          socket.emit('error', 'No se pueden obtener movimientos válidos');
        }
      } catch (error) {
        console.error('Error obteniendo movimientos válidos:', error);
        socket.emit('error', 'Error obteniendo movimientos válidos');
      }
    },

    pauseGame: (socket, gameId) => {
      try {
        const game = games.get(gameId);
        if (game) {
          game.clock.stopTimers();
          io.to(gameId).emit('gamePaused');
        }
      } catch (error) {
        console.error('Error pausando juego:', error);
      }
    },

    resumeGame: (socket, gameId) => {
      try {
        const game = games.get(gameId);
        if (game && !game.gameOver) {
          game.clock.startTimer(game.clock.currentTurn, (timeUpdate) => {
            io.to(gameId).emit('timeUpdate', timeUpdate);
          });
          io.to(gameId).emit('gameResumed');
        }
      } catch (error) {
        console.error('Error reanudando juego:', error);
      }
    },

    disconnect: (socket) => {
      console.log('Usuario desconectado:', socket.id);
      
      // Buscar jugador desconectado
      for (const [playerId, socketId] of playerSessions.entries()) {
        if (socketId === socket.id) {
          playerSessions.delete(playerId);
          
          // Notificar partidas donde estaba este jugador
          for (const [gameId, game] of games.entries()) {
            if (game.isPlayerInGame(playerId)) {
              const color = game.getPlayerColor(playerId);
              socket.to(gameId).emit('playerDisconnected', { color });
              
              // Limpiar partida si ambos jugadores se desconectan
              setTimeout(() => {
                if (games.has(gameId)) {
                  games.delete(gameId);
                  console.log(`Partida ${gameId} eliminada por inactividad`);
                }
              }, 60000); // 1 minuto
              break;
            }
          }
          break;
        }
      }
    }
  };
}

// Función para simular conexión de socket (para testing)
function simulateSocketConnection(socket) {
  const handlers = getSocketHandlers();
  
  // Configurar todos los handlers en el socket
  socket.on('restoreSession', (data) => handlers.restoreSession(socket, data));
  socket.on('createGame', (data) => handlers.createGame(socket, data));
  socket.on('joinGame', (data) => handlers.joinGame(socket, data));
  socket.on('movePiece', (data) => handlers.movePiece(socket, data));
  socket.on('getValidMoves', (data) => handlers.getValidMoves(socket, data));
  socket.on('pauseGame', (gameId) => handlers.pauseGame(socket, gameId));
  socket.on('resumeGame', (gameId) => handlers.resumeGame(socket, gameId));
  socket.on('disconnect', () => handlers.disconnect(socket));
}

// Exportaciones actualizadas
module.exports = {
  app,
  server,
  io,
  games,
  playerSessions,
  ChessGame,
  generateGameId,
  isTestMode,
  setupSocketHandlers,
  startServer,
  stopServer,
  getSocketHandlers,
  simulateSocketConnection // ← Nueva exportación para testing más fácil
};