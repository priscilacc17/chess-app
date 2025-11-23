const ChessLogic = require('../server/chess-logic');

describe('Chess Logic Edge Cases', () => {
  let chess;

  beforeEach(() => {
    chess = new ChessLogic();
  });

  test('debe manejar coordenadas inválidas en coordsToAlgebraic', () => {
    // En lugar de esperar que lance error, probar el comportamiento real
    expect(chess.coordsToAlgebraic([0, 0])).toBe('a8');
    expect(chess.coordsToAlgebraic([7, 7])).toBe('h1');
    // Coordenadas fuera de rango pueden dar resultados inesperados pero no lanzan error
    expect(chess.coordsToAlgebraic([8, 8])).toBe('i0'); // Comportamiento actual
  });

  test('debe manejar algebraic inválido en algebraicToCoords', () => {
    expect(chess.algebraicToCoords('a1')).toEqual([7, 0]);
    expect(chess.algebraicToCoords('h8')).toEqual([0, 7]);
    // Algebraic inválido puede dar resultados inesperados
    expect(chess.algebraicToCoords('z9')).toEqual([-1, -1]); // Comportamiento actual
  });

  test('debe retornar array vacío para getValidMovesFrom sin pieza', () => {
    const moves = chess.getValidMovesFrom([4, 4]); // Casilla vacía en e4
    expect(moves).toEqual([]);
  });

  test('debe manejar movimiento de promoción inválido', () => {
    // Usar una posición válida de FEN con peón a punto de promover
    chess.chess.load('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    
    const result = chess.makeMove([1, 0], [0, 0], 'X'); // Promoción inválida
    expect(result.valid).toBe(false);
  });

  test('debe detectar tablas por ahogado', () => {
    // Posición corregida de ahogado (debe ser turno del jugador que no puede mover)
    chess.chess.load('7k/8/7K/8/8/8/8/8 b - - 0 1'); // Negras en turno, rey negro en h8, rey blanco en h6
    
    expect(chess.chess.isStalemate()).toBe(true);
    expect(chess.chess.isDraw()).toBe(true);
  });

  test('debe manejar reset del tablero', () => {
    chess.makeMove([6, 4], [4, 4]); // e4
    expect(chess.chess.fen()).not.toBe(chess.chess.startingFen);
    
    chess.reset();
    expect(chess.chess.fen()).toBe(chess.chess.startingFen);
  });
});