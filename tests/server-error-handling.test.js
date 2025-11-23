const { ChessGame } = require('../server/server-core'); // ← Agregar esta línea

const { app, games, playerSessions, simulateSocketConnection } = require('../server/server');

class ErrorMockSocket {
  constructor(id) {
    this.id = id;
    this.emitted = [];
  }

  on(event, callback) {
    this.events = this.events || {};
    this.events[event] = callback;
  }

  emit(event, data) {
    this.emitted.push({ event, data });
  }

  simulateEvent(event, data) {
    if (this.events[event]) {
      this.events[event](data);
    }
  }

  hasEmitted(event) {
    return this.emitted.some(e => e.event === event);
  }
}

describe('Server Error Handling', () => {
  let socket;

  beforeEach(() => {
    games.clear();
    playerSessions.clear();
    socket = new ErrorMockSocket('error-socket');
    simulateSocketConnection(socket);
  });

  test('debe manejar joinGame con partida llena', () => {
    const gameId = 'TEST123';
    const game = new ChessGame({ base: 300, increment: 0 }, gameId);
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    games.set(gameId, game);

    socket.simulateEvent('joinGame', {
      gameId: gameId,
      playerId: 'player3'
    });

    expect(socket.hasEmitted('error')).toBe(true);
  });

  test('debe manejar joinGame con partida ya comenzada', () => {
    const gameId = 'TEST123';
    const game = new ChessGame({ base: 300, increment: 0 }, gameId);
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    game.started = true;
    games.set(gameId, game);

    socket.simulateEvent('joinGame', {
      gameId: gameId,
      playerId: 'player3'
    });

    expect(socket.hasEmitted('error')).toBe(true);
  });

  test('debe manejar getValidMoves sin partida', () => {
    socket.simulateEvent('getValidMoves', {
      gameId: 'INEXISTENTE',
      position: '0,0',
      playerId: 'player1'
    });

    expect(socket.hasEmitted('error')).toBe(true);
  });

  test('debe manejar movimiento con jugador no autorizado', () => {
    const gameId = 'TEST123';
    const game = new ChessGame({ base: 300, increment: 0 }, gameId);
    game.addPlayer('socket1', 'player1', 'white');
    games.set(gameId, game);

    socket.simulateEvent('movePiece', {
      gameId: gameId,
      from: [6, 4],
      to: [4, 4],
      playerId: 'player-no-autorizado'
    });

    expect(socket.hasEmitted('error')).toBe(true);
  });
});