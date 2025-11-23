const ChessLogic = require('../server/chess-logic');
const { Chess } = require('chess.js');

describe('Chess Logic', () => {
  let chess;

  beforeEach(() => {
    chess = new ChessLogic();
  });

  describe('Movimientos básicos', () => {
    test('debe permitir movimiento legal de peón blanco', () => {
      const result = chess.makeMove([6, 4], [4, 4]); // e2-e4
      expect(result.valid).toBe(true);
    });

    test('debe rechazar movimiento ilegal de caballo', () => {
      // Movimiento imposible: caballo intenta moverse como torre
      const result = chess.makeMove([7, 1], [7, 3]); 
      expect(result.valid).toBe(false);
    });

    test('debe detectar jaque', () => {
      // Posición clara de jaque: rey negro en e8, reina blanca en e5
      chess.chess = new Chess('rnbqkbnr/pppp1ppp/8/4Q3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 2');
      
      expect(chess.chess.isCheck()).toBe(true);
    });

    test('no debe permitir que el rey se quede en jaque', () => {
      // Configurar jaque directo
      chess.chess = new Chess('rnbqkbnr/pppp1ppp/8/4Q3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 2');
      
      // El rey negro no puede moverse a una casilla que sigue en jaque
      const invalidMove = chess.makeMove([0, 4], [0, 3]); // Rey e8-d8 (sigue en jaque por la reina en e5)
      expect(invalidMove.valid).toBe(false);
    });
  });

  describe('Movimientos especiales', () => {
    test('debe permitir enroque corto', () => {
      // Preparar tablero para enroque
      chess.chess = new Chess('rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1');
      
      const result = chess.makeMove([7, 4], [7, 6]); // Enroque corto blanco
      expect(result.valid).toBe(true);
    });

    test('debe detectar jaque mate', () => {
      // Posición de mate del loco - jaque mate en 1 movimiento
      chess.chess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1');
      
      // Esta posición ya es jaque mate para las blancas
      expect(chess.chess.isCheckmate()).toBe(true);
    });

    test('debe crear jaque mate con movimientos', () => {
      // Secuencia para crear jaque mate
      chess.makeMove([6, 4], [4, 4]); // e4
      chess.makeMove([1, 4], [3, 4]); // e5
      chess.makeMove([7, 5], [4, 2]); // Ac4
      chess.makeMove([0, 1], [2, 2]); // Cc6
      chess.makeMove([7, 3], [3, 7]); // Dh5
      chess.makeMove([0, 6], [2, 5]); // Cf6??
      chess.makeMove([3, 7], [1, 5]); // Qxf7#
      
      expect(chess.chess.isCheckmate()).toBe(true);
    });
  });
});