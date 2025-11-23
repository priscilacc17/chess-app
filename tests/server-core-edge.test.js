const { ChessGame, generateGameId } = require('../server/server-core');

describe('Server Core Edge Cases', () => {
  let game;

  beforeEach(() => {
    game = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
  });

  afterEach(() => {
    if (game.clock) game.clock.destroy();
  });

  test('debe manejar addPlayer con color específico ocupado', () => {
    game.addPlayer('socket1', 'player1', 'white');
    const result = game.addPlayer('socket2', 'player2', 'white'); // Mismo color
    
    expect(result).toBe(false);
  });

  test('debe manejar getPlayerColor para jugador no existente', () => {
    expect(game.getPlayerColor('player-inexistente')).toBeNull();
  });

  test('debe manejar makeMove después de game over', () => {
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    
    // Forzar game over
    game.gameOver = true;
    
    const result = game.makeMove([6, 4], [4, 4], null, 'player1');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('terminado');
  });

  test('debe manejar getAllValidMoves en partida nueva', () => {
    game.addPlayer('socket1', 'player1', 'white');
    const moves = game.getAllValidMoves();
    
    expect(typeof moves).toBe('object');
    expect(moves['6,4']).toBeDefined(); // Peones deberían tener movimientos
  });

  test('generateGameId debe generar formato correcto', () => {
    const id = generateGameId();
    expect(id).toMatch(/^[A-Z0-9]{6}$/);
  });
});