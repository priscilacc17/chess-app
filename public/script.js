class ChessApp {
    constructor() {
        this.socket = io();
        this.gameId = null;
        this.playerColor = null;
        this.playerId = this.getPlayerId();
        this.selectedPiece = null;
        this.validMoves = [];
        this.board = [];
        this.isPaused = false;
        
        this.initializeEventListeners();
        this.initializeSocketListeners();
        this.renderTimeControls();
        
        // Intentar restaurar sesión previa
        this.restorePreviousSession();
    }

    getPlayerId() {
        let playerId = localStorage.getItem('chessPlayerId');
        if (!playerId) {
            playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chessPlayerId', playerId);
        }
        return playerId;
    }

    restorePreviousSession() {
        const savedGameId = localStorage.getItem('currentGameId');
        if (savedGameId && this.playerId) {
            this.socket.emit('restoreSession', {
                playerId: this.playerId,
                gameId: savedGameId
            });
        }
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
            this.socket.emit('createGame', {
                timeControl: timeControl,
                playerId: this.playerId
            });
        });

        // Unirse a partida
        document.getElementById('join-game-btn').addEventListener('click', () => {
            const gameId = document.getElementById('game-id-input').value.trim().toUpperCase();
            if (gameId.length === 6) {
                this.socket.emit('joinGame', {
                    gameId: gameId,
                    playerId: this.playerId
                });
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
    this.socket.on('sessionRestored', (data) => {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        this.gameState = data.gameState; // ← GUARDAR EL ESTADO DEL JUEGO
        this.showGameScreen();
        this.board = data.gameState.board;
        this.renderBoard();
        this.updateTimes(data.gameState.whiteTime, data.gameState.blackTime);
        this.updateGameStatus('Sesión restaurada');
        this.updateTurnIndicator(data.gameState.currentTurn);
        this.highlightCheck(data.gameState.isCheck); // ← ACTUALIZAR JAQUE
        this.showMessage('Sesión restaurada exitosamente', 'success');
    });

    this.socket.on('gameCreated', (data) => {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        localStorage.setItem('currentGameId', this.gameId);
        this.showGameScreen();
        document.getElementById('current-game-id').textContent = this.gameId;
        document.getElementById('game-info').classList.remove('hidden');
        this.showMessage(`Partida creada! ID: ${this.gameId}`, 'success');
    });

    this.socket.on('gameJoined', (data) => {
        this.gameId = data.gameId;
        this.playerColor = data.color;
        localStorage.setItem('currentGameId', this.gameId);
        this.showGameScreen();
        this.showMessage('Te has unido a la partida', 'success');
    });

    this.socket.on('gameStart', (data) => {
        this.board = data.board;
        this.gameState = data; // ← GUARDAR EL ESTADO DEL JUEGO
        this.renderBoard();
        this.updateTimes(data.whiteTime, data.blackTime);
        this.updateGameStatus(`Partida iniciada - Turno de ${data.currentTurn === 'white' ? 'Blancas' : 'Negras'}`);
        this.updateTurnIndicator(data.currentTurn);
        this.highlightCheck(data.isCheck);
    });

    this.socket.on('moveMade', (data) => {
        this.board = data.board;
        this.gameState = data; // ← GUARDAR EL ESTADO DEL JUEGO
        this.renderBoard();
        this.updateTimes(data.whiteTime, data.blackTime);
        this.updateTurnIndicator(data.currentTurn);
        this.highlightCheck(data.isCheck);
        
        if (data.gameOver) {
            this.handleGameOver(data.winner, data.reason);
        } else {
            this.updateGameStatus(`Turno de ${data.currentTurn === 'white' ? 'Blancas' : 'Negras'}`);
        }
    });

    this.socket.on('validMoves', (data) => {
        this.validMoves = data.moves;
        this.highlightValidMoves();
    });

    this.socket.on('playerReconnected', (data) => {
        this.showMessage(`Jugador de ${data.color === 'white' ? 'blancas' : 'negras'} reconectado`, 'info');
    });

    this.socket.on('playerDisconnected', (data) => {
        this.showMessage(`El oponente (${data.color === 'white' ? 'blancas' : 'negras'}) se ha desconectado`, 'error');
        this.isPaused = true;
    });

    // En initializeSocketListeners(), verifica que tienes este listener:
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
        this.selectedPiece = null;
        this.validMoves = [];
        this.clearHighlights();
    });

    this.socket.on('error', (message) => {
        this.showMessage(message, 'error');
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

    // Nuevo método para obtener movimientos válidos
    getValidMoves(position) {
        if (this.gameId && position) {
            this.socket.emit('getValidMoves', {
                gameId: this.gameId,
                position: position,
                playerId: this.playerId
            });
        }
    }

    handlePieceMove(fromRow, fromCol, toRow, toCol) {
        if (!this.selectedPiece || this.isPaused) return;

        // Verificar si es un movimiento de promoción
        const piece = this.board[fromRow][fromCol];
        const isPromotion = (piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7);
        
        let promotion = null;
        if (isPromotion) {
            promotion = this.handlePromotion(toRow, toCol);
            if (!promotion) return; // Usuario canceló la promoción
        }

        this.socket.emit('movePiece', {
            gameId: this.gameId,
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            promotion: promotion,
            playerId: this.playerId
        });

        this.selectedPiece = null;
        this.validMoves = [];
        this.clearHighlights();
    }

    handlePromotion(row, col) {
        // Crear modal de promoción
        const modal = document.createElement('div');
        modal.className = 'promotion-modal';
        modal.style.left = `${col * 60 + 30}px`;
        modal.style.top = `${row * 60 + 30}px`;

        const pieces = this.playerColor === 'white' 
            ? ['Q', 'R', 'B', 'N'] 
            : ['q', 'r', 'b', 'n'];

        const pieceSymbols = {
            'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘',
            'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞'
        };

        pieces.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'promotion-piece';
            pieceElement.textContent = pieceSymbols[piece];
            pieceElement.onclick = () => {
                document.body.removeChild(modal);
                this.promotionChoice = piece;
            };
            modal.appendChild(pieceElement);
        });

        document.body.appendChild(modal);

        // Esperar a que el usuario elija
        return new Promise((resolve) => {
            const checkChoice = () => {
                if (this.promotionChoice) {
                    const choice = this.promotionChoice;
                    this.promotionChoice = null;
                    resolve(choice);
                } else {
                    setTimeout(checkChoice, 100);
                }
            };
            checkChoice();
        });
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        const pieceSymbols = {
            'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
            'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
        };

        // Determinar orientación del tablero
        const orientation = this.playerColor === 'white' ? 'normal' : 'flipped';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = orientation === 'normal' ? row : 7 - row;
                const displayCol = orientation === 'normal' ? col : 7 - col;

                const square = document.createElement('div');
                square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = displayRow;
                square.dataset.col = displayCol;

                const piece = this.board[displayRow][displayCol];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = pieceSymbols[piece];
                    pieceElement.setAttribute('data-piece', piece); // ← ESTA LÍNEA NUEVA
                    pieceElement.draggable = true;
                    
                    pieceElement.addEventListener('dragstart', (e) => {
                        if (this.canMovePiece(displayRow, displayCol)) {
                            this.handlePieceSelect(displayRow, displayCol);
                            e.dataTransfer.setData('text/plain', `${displayRow},${displayCol}`);
                        } else {
                            e.preventDefault();
                        }
                    });

                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(displayRow, displayCol));
                square.addEventListener('dragover', (e) => e.preventDefault());
                square.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const [fromRow, fromCol] = e.dataTransfer.getData('text/plain').split(',').map(Number);
                    this.handlePieceMove(fromRow, fromCol, displayRow, displayCol);
                });

                boardElement.appendChild(square);
            }
        }

        this.highlightValidMoves();
    }

    highlightValidMoves() {
        this.validMoves.forEach(move => {
            const [toRow, toCol] = move.to;
            const square = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"]`);
            if (square) {
                if (move.flags.includes('c') || move.flags.includes('e')) { // captura o captura al paso
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture', 'check');
        });
    }

    // Agregar estos métodos al final de la clase ChessApp, antes del cierre de la llave }

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

    handleSquareClick(row, col) {
        if (this.selectedPiece) {
            this.handlePieceMove(this.selectedPiece.row, this.selectedPiece.col, row, col);
        } else {
            this.handlePieceSelect(row, col);
        }
    }

    // Y mejora el método updateTimes para que sea más preciso:
    updateTimes(whiteTime, blackTime) {
        // Asegurarse de que los tiempos no sean negativos
        const safeWhiteTime = Math.max(0, whiteTime);
        const safeBlackTime = Math.max(0, blackTime);
        
        document.getElementById('white-time').textContent = this.formatTime(safeWhiteTime);
        document.getElementById('black-time').textContent = this.formatTime(safeBlackTime);
        
        // Cambiar color cuando el tiempo es bajo (opcional)
        if (safeWhiteTime < 30000) { // Menos de 30 segundos
            document.getElementById('white-time').style.color = '#ff4444';
        } else {
            document.getElementById('white-time').style.color = '#ffd700';
        }
        
        if (safeBlackTime < 30000) { // Menos de 30 segundos
            document.getElementById('black-time').style.color = '#ff4444';
        } else {
            document.getElementById('black-time').style.color = '#ffd700';
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        // Mostrar décimas de segundo cuando el tiempo es bajo
        if (totalSeconds < 10) {
            const deciseconds = Math.floor((milliseconds % 1000) / 100);
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
        }
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

    pauseGame() {
        this.socket.emit('pauseGame', this.gameId);
    }

    resumeGame() {
        this.socket.emit('resumeGame', this.gameId);
    }

    leaveGame() {
        localStorage.removeItem('currentGameId');
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



    // Mejorado: Manejar selección de pieza con movimientos válidos
    handlePieceSelect(row, col) {
        if (!this.canMovePiece(row, col)) return;

        this.selectedPiece = { row, col };
        this.clearHighlights();
        
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');

        // Obtener movimientos válidos del servidor
        this.getValidMoves(`${row},${col}`);
    }

    // Nuevo método para resaltar jaque
    // Nuevo método para resaltar jaque - CORREGIDO
    // En script.js, REEMPLAZA el método highlightCheck actual por este:

    // Método highlightCheck CORREGIDO Y SIMPLIFICADO:
    highlightCheck(isCheck) {
        // Primero limpiar highlights anteriores
        this.clearHighlights();
        
        if (isCheck && this.gameState) {
            // Usar el turno actual del gameState para saber qué rey está en jaque
            const currentTurn = this.gameState.currentTurn;
            const kingToFind = currentTurn === 'white' ? 'K' : 'k';
            
            console.log(`Resaltando jaque para: ${currentTurn}, buscando: ${kingToFind}`);
            
            // Buscar el rey en el tablero
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (this.board[row][col] === kingToFind) {
                        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                        if (square) {
                            square.classList.add('check');
                            console.log(`Rey en jaque encontrado en: ${row}, ${col}`);
                        }
                        return; // Salir después de encontrar el rey
                    }
                }
            }
        }
    }

    // Agrega este método auxiliar para obtener el turno actual:
    getCurrentTurn() {
        // Podemos determinar el turno basado en el color de las piezas que podemos mover
        // O mantener un estado del turno actual en la clase
        if (this.gameState && this.gameState.currentTurn) {
            return this.gameState.currentTurn;
        }
        
        // Fallback: determinar por las piezas que podemos mover
        return this.playerColor === 'white' ? 'white' : 'black';
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new ChessApp();
    
    // Agregar estilos CSS para el jaque después de que el DOM esté listo
    const style = document.createElement('style');
    style.textContent = `
        .square.check {
            background-color: #ff6b6b !important;
            box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.5);
        }
        
        .promotion-modal {
            position: absolute;
            background: white;
            border: 2px solid #333;
            border-radius: 5px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
        }
        
        .promotion-piece {
            padding: 10px;
            font-size: 24px;
            cursor: pointer;
            text-align: center;
        }
        
        .promotion-piece:hover {
            background: #f0f0f0;
        }
    `;
    document.head.appendChild(style);
});