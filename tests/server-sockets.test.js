const { ChessGame } = require('../server/server-core');
const { games, playerSessions, simulateSocketConnection, io } = require('../server/server');

// Mock de io mejorado - SOLO AGREGAR ESTAS LÍNEAS AL PRINCIPIO
jest.mock('../server/server', () => {
  const originalModule = jest.requireActual('../server/server');
  
  return {
    ...originalModule,
    io: {
      on: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      }),
      emit: jest.fn(),
      sockets: {
        emit: jest.fn()
      }
    }
  };
});

// Mock de socket mejorado (MANTENER ESTO)
class MockSocket {
  constructor(id) {
    this.id = id;
    this.rooms = new Set();
    this.events = {};
    this.emitted = [];
    this.roomEmissions = [];
  }

  on(event, callback) {
    this.events[event] = callback;
  }

  emit(event, data) {
    this.emitted.push({ event, data });
  }

  join(room) {
    this.rooms.add(room);
  }

  to(room) {
    return {
      emit: (event, data) => {
        this.roomEmissions.push({ event, data, room, from: this.id });
      }
    };
  }

  // Simular evento
  simulateEvent(event, data) {
    if (this.events[event]) {
      this.events[event](data);
    }
  }

  // Verificar si se emitió un evento
  hasEmitted(event) {
    return this.emitted.some(e => e.event === event);
  }

  // Obtener datos emitidos para un evento
  getEmittedData(event) {
    return this.emitted.find(e => e.event === event)?.data;
  }

  // Verificar emisiones a salas
  hasEmittedToRoom(event, room) {
    return this.roomEmissions.some(e => e.event === event && e.room === room);
  }

  // Obtener emisiones a salas
  getRoomEmissions(event, room) {
    return this.roomEmissions.filter(e => e.event === event && e.room === room);
  }

  // Limpiar todo
  clear() {
    this.emitted = [];
    this.roomEmissions = [];
  }
}

describe('Socket Handlers Integration', () => {
  let socket;

  beforeEach(() => {
    // Limpiar estado
    games.clear();
    playerSessions.clear();
    
    // Resetear mocks - AGREGAR ESTO
    if (io.to.mockClear) io.to.mockClear();
    if (io.to().emit.mockClear) io.to().emit.mockClear();
    
    // Crear socket mock
    socket = new MockSocket('test-socket-123');
    
    // Configurar handlers en el socket
    simulateSocketConnection(socket);
  });

  afterEach(() => {
    // Limpiar todos los timers después de cada test
    games.forEach(game => {
      if (game.clock) {
        game.clock.stopTimers();
      }
    });
  });

  describe('Flujo completo de partida', () => {
    // ACTUALIZAR SOLO ESTE TEST
    test('debe manejar flujo completo: crear, unirse y mover', () => {
      // 1. Crear partida
      socket.simulateEvent('createGame', {
        timeControl: { base: 300, increment: 0 },
        playerId: 'player1'
      });

      expect(socket.hasEmitted('gameCreated')).toBe(true);
      const gameData = socket.getEmittedData('gameCreated');
      const gameId = gameData.gameId;

      // Verificar que la partida se creó
      expect(games.has(gameId)).toBe(true);
      
      const game = games.get(gameId);
      game.clock.stopTimers();

      // 2. Unirse a partida
      const socket2 = new MockSocket('test-socket-456');
      simulateSocketConnection(socket2);
      
      socket2.simulateEvent('joinGame', {
        gameId: gameId,
        playerId: 'player2'
      });

      expect(socket2.hasEmitted('gameJoined')).toBe(true);

      // 3. Hacer movimiento - ACTUALIZAR LA VERIFICACIÓN
      socket.simulateEvent('movePiece', {
        gameId: gameId,
        from: [6, 3],
        to: [5, 3],
        playerId: 'player1'
      });

      // VERIFICACIÓN ACTUALIZADA - usar el mock de Jest
      expect(io.to).toHaveBeenCalledWith(gameId);
      expect(io.to(gameId).emit).toHaveBeenCalledWith('moveMade', expect.any(Object));
    });
  });

  describe('Handlers individuales', () => {
    // ACTUALIZAR ESTE TEST TAMBIÉN
    test('movePiece debe procesar movimiento válido', () => {
      const gameId = 'TEST123';
      const game = new ChessGame({ base: 300, increment: 0 }, gameId);
      game.addPlayer(socket.id, 'player1', 'white');
      games.set(gameId, game);
      playerSessions.set('player1', socket.id);

      // Detener timers antes del test
      game.clock.stopTimers();

      socket.simulateEvent('movePiece', {
        gameId: gameId,
        from: [6, 3],
        to: [5, 3],
        playerId: 'player1'
      });

      // VERIFICACIÓN ACTUALIZADA
      expect(io.to).toHaveBeenCalledWith(gameId);
      expect(io.to(gameId).emit).toHaveBeenCalledWith('moveMade', expect.any(Object));
    });

    // MANTENER TODOS LOS OTROS TESTS EXISTENTES
    test('createGame debe crear partida correctamente', () => {
      socket.simulateEvent('createGame', {
        timeControl: { base: 300, increment: 0 },
        playerId: 'player1'
      });

      expect(socket.hasEmitted('gameCreated')).toBe(true);
      const gameData = socket.getEmittedData('gameCreated');
      expect(gameData.color).toBe('white');
      expect(gameData.playerId).toBe('player1');
      expect(games.has(gameData.gameId)).toBe(true);

      // Limpiar timers
      const game = games.get(gameData.gameId);
      if (game.clock) {
        game.clock.stopTimers();
      }
    });

    test('joinGame debe unirse a partida existente', () => {
      // Primero crear partida
      const gameId = 'TEST123';
      const game = new ChessGame({ base: 300, increment: 0 }, gameId);
      game.addPlayer('creator-socket', 'creator', 'white');
      games.set(gameId, game);

      // Detener timers existentes
      game.clock.stopTimers();

      socket.simulateEvent('joinGame', {
        gameId: gameId,
        playerId: 'player2'
      });

      expect(socket.hasEmitted('gameJoined')).toBe(true);
      expect(socket.getEmittedData('gameJoined').color).toBe('black');
    });

    test('getValidMoves debe retornar movimientos', () => {
      const gameId = 'TEST123';
      const game = new ChessGame({ base: 300, increment: 0 }, gameId);
      game.addPlayer(socket.id, 'player1', 'white');
      games.set(gameId, game);
      playerSessions.set('player1', socket.id);

      game.clock.stopTimers();

      socket.simulateEvent('getValidMoves', {
        gameId: gameId,
        position: '6,3',
        playerId: 'player1'
      });

      expect(socket.hasEmitted('validMoves')).toBe(true);
    });

    test('restoreSession debe restaurar sesión existente', () => {
      const gameId = 'TEST123';
      const game = new ChessGame({ base: 300, increment: 0 }, gameId);
      game.addPlayer('original-socket', 'player1', 'white');
      games.set(gameId, game);
      playerSessions.set('player1', 'original-socket');

      game.clock.stopTimers();

      socket.simulateEvent('restoreSession', {
        gameId: gameId,
        playerId: 'player1'
      });

      expect(socket.hasEmitted('sessionRestored')).toBe(true);
      expect(socket.getEmittedData('sessionRestored').color).toBe('white');
    });
  });

  describe('Manejo de errores', () => {
    // MANTENER TODOS ESTOS TESTS
    test('debe manejar partida no encontrada en joinGame', () => {
      socket.simulateEvent('joinGame', {
        gameId: 'INEXISTENTE',
        playerId: 'player1'
      });

      expect(socket.hasEmitted('error')).toBe(true);
      expect(socket.getEmittedData('error')).toBe('Partida no encontrada');
    });

    test('debe manejar movimiento no autorizado', () => {
      socket.simulateEvent('movePiece', {
        gameId: 'INEXISTENTE',
        from: [6, 3],
        to: [5, 3],
        playerId: 'player1'
      });

      expect(socket.hasEmitted('error')).toBe(true);
    });

    test('debe manejar sesión no restaurable', () => {
      socket.simulateEvent('restoreSession', {
        gameId: 'INEXISTENTE',
        playerId: 'player1'
      });

      expect(socket.hasEmitted('error')).toBe(true);
    });
  });
});