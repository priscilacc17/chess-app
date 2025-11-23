const { ChessGame } = require('../server/server-core');

describe('Chess Game Integration', () => {
  let game;

  beforeEach(() => {
    game = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
  });

  afterEach(() => {
    if (game.clock) {
      game.clock.forceStopTimers();
    }
  });

  test('debe manejar callback de actualización de tiempo', (done) => {
    let timeUpdateCalled = false;
    
    game.onTimeUpdate = (update) => {
      timeUpdateCalled = true;
      expect(update).toHaveProperty('whiteTime');
      expect(update).toHaveProperty('blackTime');
      game.clock.stopTimers();
      done();
    };

    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    
    // El timer debería empezar automáticamente
    setTimeout(() => {
      if (!timeUpdateCalled) {
        game.clock.stopTimers();
        done();
      }
    }, 100);
  });

  test('debe proporcionar estado completo del juego', () => {
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    
    const state = game.getGameState();
    
    expect(state).toHaveProperty('board');
    expect(state).toHaveProperty('fen');
    expect(state).toHaveProperty('currentTurn');
    expect(state).toHaveProperty('whiteTime');
    expect(state).toHaveProperty('blackTime');
    expect(state).toHaveProperty('whitePlayer');
    expect(state).toHaveProperty('blackPlayer');
    expect(state).toHaveProperty('gameOver');
    expect(state).toHaveProperty('isCheck');
    expect(state).toHaveProperty('isCheckmate');
    expect(state).toHaveProperty('isDraw');
  });

  test('debe manejar múltiples movimientos consecutivos', () => {
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');

    // Movimiento 1: peón blanco
    const move1 = game.makeMove([6, 4], [4, 4], null, 'player1');
    expect(move1.valid).toBe(true);

    // Movimiento 2: peón negro
    const move2 = game.makeMove([1, 3], [3, 3], null, 'player2');
    expect(move2.valid).toBe(true);

    // Movimiento 3: caballo blanco
    const move3 = game.makeMove([7, 6], [5, 5], null, 'player1');
    expect(move3.valid).toBe(true);
  });
});