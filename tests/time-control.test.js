const { ChessGame } = require('../server/server-core');

describe('Time Control Integration', () => {
  let game;

  afterEach(() => {
    if (game && game.clock) {
      game.clock.forceStopTimers();
    }
  });

  test('debe aplicar incremento correctamente', () => {
    game = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
    game.addPlayer('socket1', 'player1', 'white');
    
    const initialTime = game.clock.whiteTime;
    game.clock.switchTurn();
    
    // Debería tener +5 segundos (5000 ms)
    expect(game.clock.whiteTime).toBe(initialTime + 5000);
  });

  test('debe detectar victoria por tiempo', (done) => {
    game = new ChessGame({ base: 0.1, increment: 0 }, 'TEST123'); // 100ms
    game.addPlayer('socket1', 'player1', 'white');
    
    let timeUpdates = 0;
    game.clock.onTimeUpdate = (update) => {
      timeUpdates++;
      if (update.gameOver) {
        expect(update.winner).toBe('black');
        expect(game.clock.isTimeUp()).toBe(true);
        done();
      }
    };

    game.clock.startTimer('white', game.clock.onTimeUpdate);
  }, 1000); // Timeout de 1 segundo

  test('debe pausar y reanudar correctamente', () => {
    game = new ChessGame({ base: 300, increment: 0 }, 'TEST123');
    game.addPlayer('socket1', 'player1', 'white');
    
    game.clock.startTimer('white', () => {});
    expect(game.clock.timers.white).toBeDefined();
    
    game.clock.stopTimers();
    expect(game.clock.timers.white).toBeNull();
  });
});