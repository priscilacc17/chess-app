const { Chess } = require('chess.js');

class ChessLogic {
  constructor() {
    this.chess = new Chess();
  }

  // Métodos para testing de movimientos
  isValidMove(from, to, promotion = null) {
    try {
      const move = {
        from: this.coordsToAlgebraic(from),
        to: this.coordsToAlgebraic(to),
        promotion: promotion
      };
      return this.chess.move(move) !== null;
    } catch (error) {
      return false;
    }
  }

  makeMove(from, to, promotion = null) {
    try {
      const move = {
        from: this.coordsToAlgebraic(from),
        to: this.coordsToAlgebraic(to),
        promotion: promotion
      };
      const result = this.chess.move(move);
      return {
        valid: true,
        move: result,
        fen: this.chess.fen(),
        isCheck: this.chess.isCheck(),
        isCheckmate: this.chess.isCheckmate(),
        isDraw: this.chess.isDraw(),
        isStalemate: this.chess.isStalemate()
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  coordsToAlgebraic([row, col]) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  }

  algebraicToCoords(algebraic) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    const file = algebraic[0];
    const rank = algebraic[1];
    return [ranks.indexOf(rank), files.indexOf(file)];
  }

  getValidMovesFrom(position) {
    const algebraic = this.coordsToAlgebraic(position);
    return this.chess.moves({ square: algebraic, verbose: true });
  }

  // En server/chess-logic.js, actualiza el método:
    isInCheck() {
        return this.chess.isCheck();
    }

  getBoard() {
    const board = [];
    const chessBoard = this.chess.board();
    
    for (let i = 0; i < 8; i++) {
      const row = [];
      for (let j = 0; j < 8; j++) {
        const piece = chessBoard[i]?.[j];
        row.push(piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : '');
      }
      board.push(row);
    }
    return board;
  }

  reset() {
    this.chess = new Chess();
  }
}

module.exports = ChessLogic;