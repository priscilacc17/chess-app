class ChessClock {
  constructor(timeControl) {
    this.timeControl = timeControl;
    this.whiteTime = timeControl.base * 1000;
    this.blackTime = timeControl.base * 1000;
    this.currentTurn = 'white';
    this.timers = { white: null, black: null };
    this.gameOver = false;
    this.lastMoveTime = Date.now();
  }

  startTimer(color, onTimeUpdate = null) {
    this.stopTimers();
    
    this.timers[color] = setInterval(() => {
      if (color === 'white') {
        this.whiteTime -= 100;
      } else {
        this.blackTime -= 100;
      }

      if (onTimeUpdate) {
        onTimeUpdate({
          whiteTime: this.whiteTime,
          blackTime: this.blackTime,
          gameOver: this.whiteTime <= 0 || this.blackTime <= 0,
          winner: this.whiteTime <= 0 ? 'black' : 'white'
        });
      }

      if (this.whiteTime <= 0 || this.blackTime <= 0) {
        this.gameOver = true;
        this.stopTimers();
      }
    }, 100);
  }

    // En server/chess-clock.js, mejora stopTimers:
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

    // Agrega este método:
    forceStopTimers() {
        this.stopTimers();
        // Asegurar que no queden referencias
        this.timers = { white: null, black: null };
    }

// En chess-clock.js, mejora el método switchTurn:

    switchTurn() {
        // Detener el timer actual primero
        this.stopTimers();
        
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.lastMoveTime = Date.now();
        
        // Aplicar incremento al jugador que acaba de mover
        if (this.timeControl.increment > 0) {
            if (this.currentTurn === 'black') {
                // El jugador que acaba de mover es blanco, le damos incremento
                this.whiteTime += this.timeControl.increment * 1000;
            } else {
                // El jugador que acaba de mover es negro, le damos incremento  
                this.blackTime += this.timeControl.increment * 1000;
            }
        }
        
        // Iniciar el timer del nuevo jugador
        if (this.onTimeUpdate && !this.gameOver) {
            this.startTimer(this.currentTurn, this.onTimeUpdate);
        }
    }

  getTimes() {
    return {
      whiteTime: this.whiteTime,
      blackTime: this.blackTime,
      currentTurn: this.currentTurn
    };
  }

  isTimeUp() {
    return this.whiteTime <= 0 || this.blackTime <= 0;
  }

  getWinnerByTime() {
    if (this.whiteTime <= 0) return 'black';
    if (this.blackTime <= 0) return 'white';
    return null;
  }

  // Método para limpiar completamente (usado en tests)
  destroy() {
    this.stopTimers();
  }
}

module.exports = ChessClock;