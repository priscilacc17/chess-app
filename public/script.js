class ChessApp {
    constructor() {
        this.socket = io();
        this.gameId = null;
        this.playerColor = null;
        this.selectedPiece = null;
        this.validMoves = [];
        this.board = [];
        this.lastMoveTime = Date.now();
        this.isPaused = false;
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.renderTimeControls();
    }

    initializeEventListeners() {
        // Botones de control de tiempo
        document.querySelectorAll('.time-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Crear partida
        document.getElementById('create-game-btn').addEventListener('click', () => {
            const timeControl = this.getSelectedTimeControl();
            this.socket.emit('createGame', timeControl);
        });

        // Unirse a partida
        document.getElementById('join-game-btn').addEventListener('click', () => {
            const gameId = document.getElementById('game-id-input').value.trim().toUpperCase();
            if (gameId.length === 6) {
                this.socket.emit('joinGame', gameId);
            } else {
                this.showMessage('ID de partida inválido', 'error');
            }
        });

        // Controles de juego
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pauseGame();
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeGame();
        });

        document.getElementById('leave-game-btn').addEventListener('click', () => {
            this.leaveGame();
        });

        // Permitir Enter para unirse a partida
        document.getElementById('game-id-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('join-game-btn').click();
            }
        });
    }

    initializeSocketListeners() {
        this.socket.on('gameCreated', (data) => {
            this.gameId = data.gameId;
            this.playerColor = data.color;
            this.showGameScreen();
            document.getElementById('current-game-id').textContent = this.gameId;
            document.getElementById('game-info').classList.remove('hidden');
            this.showMessage(`Partida creada! ID: ${this.gameId}`, 'success');
        });

        this.socket.on('gameJoined', (data) => {
            this.gameId = data.gameId;
            this.playerColor = data.color;
            this.showGameScreen();
            this.showMessage('Te has unido a la partida', 'success');
        });

        this.socket.on('gameStart', (data) => {
            this.board = data.board;
            this.renderBoard();
            this.updateTimes(data.whiteTime, data.blackTime);
            this.updateGameStatus(`Partida iniciada - Turno de ${data.currentTurn === 'white' ? 'Blancas' : 'Negras'}`);
            this.updateTurnIndicator(data.currentTurn);
            
            // Iniciar temporizador si es nuestro turno
            if (data.currentTurn === this.playerColor) {
                this.startTimer();
            }
        });

        this.socket.on('moveMade', (data) => {
            this.board = data.board;
            this.renderBoard();
            this.updateTimes(data.whiteTime, data.blackTime);
            this.updateTurnIndicator(data.currentTurn);
            
            if (data.gameOver) {
                this.handleGameOver(data.winner);
            } else {
                this.updateGameStatus(`Turno de ${data.currentTurn === 'white' ? 'Blancas' : 'Negras'}`);
                
                // Iniciar temporizador si es nuestro turno
                if (data.currentTurn === this.playerColor) {
                    this.startTimer();
                }
            }
        });

        this.socket.on('timeUpdate', (data) => {
            this.updateTimes(data.whiteTime, data.blackTime);
            
            if (data.gameOver) {
                this.handleGameOver(data.winner, 'time');
            }
        });

        this.socket.on('gameOver', (data) => {
            this.handleGameOver(data.winner, data.reason);
        });

        this.socket.on('invalidMove', (data) => {
            this.showMessage(`Movimiento inválido: ${data.reason}`, 'error');
        });

        this.socket.on('error', (message) => {
            this.showMessage(message, 'error');
        });

        this.socket.on('playerDisconnected', () => {
            this.showMessage('El oponente se ha desconectado', 'error');
            setTimeout(() => {
                this.leaveGame();
            }, 3000);
        });

        this.socket.on('gamePaused', () => {
            this.isPaused = true;
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('resume-btn').classList.remove('hidden');
            this.showMessage('Juego pausado', 'info');
        });

        this.socket.on('gameResumed', () => {
            this.isPaused = false;
            document.getElementById('pause-btn').classList.remove('hidden');
            document.getElementById('resume-btn').classList.add('hidden');
            this.showMessage('Juego reanudado', 'info');
        });
    }

    getSelectedTimeControl() {
        const activeTimeOption = document.querySelector('.time-option.active');
        if (activeTimeOption) {
            const [minutes, increment] = activeTimeOption.dataset.time.split('+').map(Number);
            return { base: minutes * 60, increment };
        } else {
            const minutes = parseInt(document.getElementById('custom-minutes').value) || 5;
            const increment = parseInt(document.getElementById('custom-increment').value) || 0;
            return { base: minutes * 60, increment };
        }
    }

    showGameScreen() {
        document.getElementById('lobby').classList.remove('active');
        document.getElementById('game').classList.add('active');
    }

    showLobbyScreen() {
        document.getElementById('game').classList.remove('active');
        document.getElementById('lobby').classList.add('active');
        document.getElementById('game-info').classList.add('hidden');
    }

    renderTimeControls() {
        // Seleccionar 5 minutos por defecto
        document.querySelector('.time-option[data-time="5+0"]').classList.add('active');
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        const pieceSymbols = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = pieceSymbols[piece];
                    pieceElement.draggable = true;
                    
                    pieceElement.addEventListener('dragstart', (e) => {
                        if (this.canMovePiece(row, col)) {
                            this.handlePieceSelect(row, col);
                            e.dataTransfer.setData('text/plain', `${row},${col}`);
                        } else {
                            e.preventDefault();
                        }
                    });

                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                square.addEventListener('dragover', (e) => e.preventDefault());
                square.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const [fromRow, fromCol] = e.dataTransfer.getData('text/plain').split(',').map(Number);
                    this.handlePieceMove(fromRow, fromCol, row, col);
                });

                boardElement.appendChild(square);
            }
        }

        this.highlightValidMoves();
    }

    canMovePiece(row, col) {
        if (!this.playerColor || this.isPaused) return false;
        
        const piece = this.board[row][col];
        if (!piece) return false;

        // Verificar que la pieza pertenece al jugador
        if (this.playerColor === 'white') {
            return piece === piece.toUpperCase();
        } else {
            return piece === piece.toLowerCase();
        }
    }

    handlePieceSelect(row, col) {
        if (!this.canMovePiece(row, col)) return;

        this.selectedPiece = { row, col };
        this.clearHighlights();
        
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');

        // Calcular movimientos válidos (simplificado)
        this.calculateValidMoves(row, col);
        this.highlightValidMoves();
    }

    handleSquareClick(row, col) {
        if (this.selectedPiece) {
            this.handlePieceMove(this.selectedPiece.row, this.selectedPiece.col, row, col);
        } else {
            this.handlePieceSelect(row, col);
        }
    }

    handlePieceMove(fromRow, fromCol, toRow, toCol) {
        if (!this.selectedPiece || this.isPaused) return;

        const timeSpent = Date.now() - this.lastMoveTime;
        
        this.socket.emit('movePiece', {
            gameId: this.gameId,
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            timeSpent: timeSpent
        });

        this.selectedPiece = null;
        this.validMoves = [];
        this.clearHighlights();
        this.lastMoveTime = Date.now();
    }

    calculateValidMoves(row, col) {
        // En una implementación completa, aquí se calcularían los movimientos válidos
        // Para este ejemplo, permitimos mover a cualquier casilla vacía
        this.validMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r !== row || c !== col) && !this.board[r][c]) {
                    this.validMoves.push([r, c]);
                }
            }
        }
    }

    highlightValidMoves() {
        this.validMoves.forEach(([row, col]) => {
            const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            if (square) {
                if (this.board[row][col]) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture');
        });
    }

    updateTimes(whiteTime, blackTime) {
        document.getElementById('white-time').textContent = this.formatTime(whiteTime);
        document.getElementById('black-time').textContent = this.formatTime(blackTime);
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateGameStatus(message) {
        document.getElementById('status-message').textContent = message;
    }

    updateTurnIndicator(turn) {
        const indicator = document.getElementById('turn-indicator');
        indicator.textContent = `Turno actual: ${turn === 'white' ? 'Blancas' : 'Negras'}`;
        indicator.style.color = turn === 'white' ? '#ffffff' : '#000000';
        indicator.style.backgroundColor = turn === 'white' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        indicator.style.padding = '5px 10px';
        indicator.style.borderRadius = '5px';
    }

    startTimer() {
        this.lastMoveTime = Date.now();
    }

    pauseGame() {
        this.socket.emit('pauseGame', this.gameId);
    }

    resumeGame() {
        this.socket.emit('resumeGame', this.gameId);
    }

    leaveGame() {
        this.socket.disconnect();
        this.socket.connect();
        this.showLobbyScreen();
        this.showMessage('Has abandonado la partida', 'info');
    }

    handleGameOver(winner, reason = 'checkmate') {
        let message = '';
        if (winner === 'draw') {
            message = '¡Empate!';
        } else {
            const winnerText = winner === 'white' ? 'Blancas' : 'Negras';
            const reasonText = reason === 'time' ? 'por tiempo' : 'por jaque mate';
            message = `¡${winnerText} ganan ${reasonText}!`;
            
            if (winner === this.playerColor) {
                message = `¡Has ganado ${reasonText}!`;
            } else {
                message = `Has perdido ${reasonText}`;
            }
        }
        
        this.updateGameStatus(message);
        this.showMessage(message, winner === this.playerColor ? 'success' : 'error');
        this.isPaused = true;
    }

    showMessage(text, type = 'info') {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = text;
        
        messagesContainer.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new ChessApp();
});