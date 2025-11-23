const { ChessGame } = require('../server/server-core');

describe('Integration Tests', () => {
  let game1, game2;

  afterEach(() => {
    if (game1 && game1.clock) game1.clock.destroy();
    if (game2 && game2.clock) game2.clock.destroy();
  });

  test('flujo completo de movimiento y cambio de turno', () => {
    game1 = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
    
    game1.addPlayer('socket1', 'player1', 'white');
    game1.addPlayer('socket2', 'player2', 'black');
    
    const moveResult = game1.makeMove([6, 4], [4, 4], null, 'player1');
    expect(moveResult.valid).toBe(true);
    
    const gameState = game1.getGameState();
    expect(gameState.currentTurn).toBe('black');
  });

  test('debe rechazar movimiento de jugador incorrecto', () => {
    game2 = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
    
    game2.addPlayer('socket1', 'player1', 'white');
    game2.addPlayer('socket2', 'player2', 'black');
    
    const moveResult = game2.makeMove([1, 4], [3, 4], null, 'player2');
    expect(moveResult.valid).toBe(false);
    expect(moveResult.reason).toContain('turno');
  });
});