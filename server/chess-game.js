class ChessGame {
  constructor(timeControl) {
    this.players = {
      white: null,
      black: null
    };
    this.board = this.initializeBoard();
    this.currentTurn = 'white';
    this.timeControl = timeControl; // { base: segundos, increment: segundos }
    this.whiteTime = timeControl.base * 1000; // Convertir a milisegundos
    this.blackTime = timeControl.base * 1000;
    this.timers = {
      white: null,
      black: null
    };
    this.gameOver = false;
    this.lastMoveTime = Date.now();
  }

  // Inicializar tablero de ajedrez
  initializeBoard() {
    // Representación del tablero (8x8)
    // 'P' = Peón blanco, 'R' = Torre blanca, 'N' = Caballo blanco, etc.
    // Las minúsculas representan piezas negras
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
  }

  // Verificar si un jugador está en esta partida
  isPlayerInGame(playerId) {
    return this.players.white === playerId || this.players.black === playerId;
  }

  // Obtener color del jugador
  getPlayerColor(playerId) {
    if (this.players.white === playerId) return 'white';
    if (this.players.black === playerId) return 'black';
    return null;
  }

  // Realizar movimiento
  makeMove(from, to, playerId) {
    if (this.gameOver) {
      return { valid: false, reason: 'La partida ha terminado' };
    }

    const playerColor = this.getPlayerColor(playerId);
    if (playerColor !== this.currentTurn) {
      return { valid: false, reason: 'No es tu turno' };
    }

    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;

    // Validaciones básicas del movimiento
    if (!this.isValidPosition(fromRow, fromCol) || !this.isValidPosition(toRow, toCol)) {
      return { valid: false, reason: 'Posición inválida' };
    }

    const piece = this.board[fromRow][fromCol];
    if (!piece) {
      return { valid: false, reason: 'No hay pieza en la posición de origen' };
    }

    // Verificar que la pieza pertenece al jugador
    if ((playerColor === 'white' && piece === piece.toLowerCase()) ||
        (playerColor === 'black' && piece === piece.toUpperCase())) {
      return { valid: false, reason: 'Esa no es tu pieza' };
    }

    // Validación básica de movimiento (simplificada para este ejemplo)
    if (!this.isValidMove(from, to, playerColor)) {
      return { valid: false, reason: 'Movimiento inválido' };
    }

    // Realizar el movimiento
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = '';

    // Cambiar turno
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    this.lastMoveTime = Date.now();

    // Verificar jaque mate o tablas (simplificado)
    const gameOverInfo = this.checkGameOver();
    
    return {
      valid: true,
      gameOver: gameOverInfo.gameOver,
      winner: gameOverInfo.winner
    };
  }

  // Validación básica de movimiento (simplificada)
  isValidMove(from, to, playerColor) {
    // En una implementación real, aquí iría la lógica completa de validación
    // de movimientos de ajedrez para cada tipo de pieza
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = this.board[fromRow][fromCol];
    
    // Validación simplificada para demostración
    // En una implementación completa, esto debería validar:
    // - Movimientos legales para cada tipo de pieza
    // - No dejar al rey en jaque
    // - Enroque, captura al paso, promoción de peón, etc.
    
    return true; // Simplificado para el ejemplo
  }

  // Verificar si la partida ha terminado
  checkGameOver() {
    // En una implementación completa, verificar:
    // - Jaque mate
    // - Ahogado
    // - Material insuficiente
    // - Regla de los 50 movimientos
    // - Repetición triple
    
    return { gameOver: false, winner: null };
  }

  // Verificar si una posición está dentro del tablero
  isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  // Obtener estado actual del tablero
  getBoard() {
    return this.board;
  }

  // Actualizar tiempo del jugador
  updateTime(playerId, timeSpent) {
    const playerColor = this.getPlayerColor(playerId);
    if (playerColor === 'white') {
      this.whiteTime -= timeSpent;
      if (this.timeControl.increment > 0) {
        this.whiteTime += this.timeControl.increment * 1000;
      }
    } else {
      this.blackTime -= timeSpent;
      if (this.timeControl.increment > 0) {
        this.blackTime += this.timeControl.increment * 1000;
      }
    }
  }

  // Iniciar temporizador para el jugador actual
  startTimer(playerId, callback) {
    this.stopTimers();
    
    const playerColor = this.getPlayerColor(playerId);
    const timerKey = playerColor;
    
    this.timers[timerKey] = setInterval(() => {
      if (playerColor === 'white') {
        this.whiteTime -= 100;
      } else {
        this.blackTime -= 100;
      }
      
      // Verificar si el tiempo se agotó
      let gameOver = false;
      let winner = null;
      
      if (this.whiteTime <= 0) {
        gameOver = true;
        winner = 'black';
        this.stopTimers();
      } else if (this.blackTime <= 0) {
        gameOver = true;
        winner = 'white';
        this.stopTimers();
      }
      
      callback({
        whiteTime: this.whiteTime,
        blackTime: this.blackTime,
        gameOver,
        winner
      });
    }, 100);
  }

  // Pausar todos los temporizadores
  pauseTimers() {
    this.stopTimers();
  }

  // Detener todos los temporizadores
  stopTimers() {
    if (this.timers.white) {
      clearInterval(this.timers.white);
      this.timers.white = null;
    }
    if (this.timers.black) {
      clearInterval(this.timers.black);
      this.timers.black = null;
    }
  }
}

module.exports = ChessGame;