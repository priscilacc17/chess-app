const ChessLogic = require('./chess-logic');
const ChessClock = require('./chess-clock');

// Clase ChessGame sin la parte del servidor Express/Socket.io
class ChessGame {
    constructor(timeControl, gameId) {
        this.gameId = gameId;
        this.chess = new ChessLogic();
        this.clock = new ChessClock(timeControl);
        this.players = {
            white: null,
            black: null
        };
        this.playerIds = {
            white: null,
            black: null
        };  
        this.gameOver = false;
        this.started = false;
        this.onTimeUpdate = null; // ← Agregar esta línea
    }

  // En server-core.js, modifica el método addPlayer:

    addPlayer(socketId, playerId, color = null) {
        if (!color) {
            color = this.players.white ? 'black' : 'white';
        }
        
        if (this.players[color]) {
            return false;
        }
        
        this.players[color] = socketId;
        this.playerIds[color] = playerId;
        
        if (this.players.white && this.players.black) {
            this.started = true;
            // Configurar el callback ANTES de iniciar el timer
            this.clock.onTimeUpdate = this.onTimeUpdate;
            this.clock.startTimer('white', this.onTimeUpdate);
        }
        
        return color;
    }

  isPlayerInGame(playerId) {
    return this.playerIds.white === playerId || this.playerIds.black === playerId;
  }

  getPlayerColor(playerId) {
    if (this.playerIds.white === playerId) return 'white';
    if (this.playerIds.black === playerId) return 'black';
    return null;
  }

  // En server-core.js, modifica makeMove:

    makeMove(from, to, promotion = null, playerId) {
        if (this.gameOver) {
            return { valid: false, reason: 'La partida ha terminado' };
        }

        const playerColor = this.getPlayerColor(playerId);
        if (playerColor !== this.clock.currentTurn) {
            return { valid: false, reason: 'No es tu turno' };
        }

        const moveResult = this.chess.makeMove(from, to, promotion);
        
        if (moveResult.valid) {
            // El switchTurn ahora maneja el cambio de timer automáticamente
            this.clock.switchTurn();
            
            let gameOver = false;
            let winner = null;
            let reason = null;

            if (moveResult.isCheckmate) {
                gameOver = true;
                winner = playerColor;
                reason = 'checkmate';
                this.clock.stopTimers();
            } else if (moveResult.isDraw || moveResult.isStalemate) {
                gameOver = true;
                winner = 'draw';
                reason = moveResult.isStalemate ? 'stalemate' : 'draw';
                this.clock.stopTimers();
            }

            return {
                valid: true,
                move: moveResult.move,
                gameOver,
                winner,
                reason,
                fen: moveResult.fen,
                isCheck: moveResult.isCheck
            };
        } else {
            return { valid: false, reason: moveResult.error };
        }
    }

  getGameState() {
    return {
      board: this.chess.getBoard(),
      fen: this.chess.chess.fen(),
      currentTurn: this.clock.currentTurn,
      whiteTime: this.clock.whiteTime,
      blackTime: this.clock.blackTime,
      whitePlayer: this.playerIds.white,
      blackPlayer: this.playerIds.black,
      gameOver: this.gameOver,
      isCheck: this.chess.isInCheck(),
      isCheckmate: this.chess.chess.isCheckmate(),
      isDraw: this.chess.chess.isDraw()
    };
  }

  getAllValidMoves() {
    const moves = {};
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const validMoves = this.chess.getValidMovesFrom([i, j]);
        if (validMoves.length > 0) {
          moves[`${i},${j}`] = validMoves.map(move => ({
            to: this.chess.algebraicToCoords(move.to),
            flags: move.flags,
            promotion: move.promotion
          }));
        }
      }
    }
    return moves;
  }
}

// Funciones auxiliares
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = {
  ChessGame,
  generateGameId
};