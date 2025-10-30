// Chess Game with Minimax AI

// Piece Unicode characters
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Piece values for evaluation
const PIECE_VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000
};

// Position bonuses for pieces (encourages good positioning)
const POSITION_BONUS = {
    'P': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'N': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'B': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'R': [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    'Q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'K': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

class ChessGame {
    constructor() {
        // Game settings
        this.settings = {
            timerEnabled: false,
            timeControl: 'blitz5',
            customMinutes: 5,
            customIncrement: 0,
            chess960: false,
            handicapEnabled: false,
            handicapSide: 'black',
            handicapPieces: [],
            boardTheme: 'classic',
            soundsEnabled: true,
            animationsEnabled: true,
            gameMode: 'ai' // 'ai' or 'human'
        };

        // Sound effects (using Web Audio API with synthesized sounds)
        // Create a single shared AudioContext to avoid browser limits
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.audioContext = null;
        }

        this.sounds = {
            move: () => this.playSound(400, 0.1, 'sine', 0.3),
            capture: () => this.playSound(200, 0.15, 'triangle', 0.4),
            check: () => this.playSound(800, 0.2, 'square', 0.2),
            gameOver: () => this.playGameOverSound()
        };

        // Board flip state
        this.boardFlipped = false;

        // Promotion state
        this.pendingPromotion = null;

        // Timer state
        this.timers = {
            white: 300000, // milliseconds
            black: 300000,
            increment: 0,
            activeTimer: null,
            lastUpdate: null
        };

        // Initial board setup (standard chess starting position)
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        this.currentPlayer = 'white'; // white or black
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.gameOver = false;
        this.aiDifficulty = 3; // depth of minimax search

        // History navigation
        this.viewingHistoryIndex = null; // null means viewing current game
        this.fullGameHistory = []; // Stores complete game states

        this.initializeBoard();
        this.attachEventListeners();
        this.setupSettingsModal();
        this.setupGameCodeHandlers();
        this.setupGameModeHandlers();
        this.applyBoardTheme();
    }

    // ========== SOUND EFFECTS ==========

    playSound(frequency, duration, type, volume) {
        if (!this.settings.soundsEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    playGameOverSound() {
        if (!this.settings.soundsEnabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.5);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (e) {
            console.warn('Error playing game over sound:', e);
        }
    }

    initializeBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece !== '.') {
                    square.innerHTML = `<span class="piece">${PIECES[piece]}</span>`;
                }

                square.addEventListener('click', (e) => this.handleSquareClick(row, col));
                chessboard.appendChild(square);
            }
        }

        this.updateStatus();
    }

    attachEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.resetGame());
        document.getElementById('undoMove').addEventListener('click', () => this.undoMove());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.aiDifficulty = parseInt(e.target.value);
        });
        document.getElementById('flipBoard').addEventListener('click', () => this.flipBoard());
    }

    setupGameModeHandlers() {
        const gameModeSelect = document.getElementById('gameMode');
        const difficultySelector = document.getElementById('difficultySelector');

        gameModeSelect.addEventListener('change', (e) => {
            this.settings.gameMode = e.target.value;

            // Show/hide difficulty selector based on mode
            if (e.target.value === 'ai') {
                difficultySelector.style.display = 'flex';
            } else {
                difficultySelector.style.display = 'none';
            }

            // Reset game when mode changes
            this.resetGame();
        });
    }

    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        const chessboard = document.getElementById('chessboard');

        if (this.boardFlipped) {
            chessboard.classList.add('flipped');
        } else {
            chessboard.classList.remove('flipped');
        }
    }

    applyBoardTheme() {
        const chessboard = document.getElementById('chessboard');
        // Remove all theme classes
        chessboard.classList.remove('theme-classic', 'theme-wood', 'theme-marble', 'theme-neon', 'theme-ocean');

        // Add current theme
        if (this.settings.boardTheme !== 'classic') {
            chessboard.classList.add(`theme-${this.settings.boardTheme}`);
        }
    }

    setupSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelSettings');
        const applyBtn = document.getElementById('applySettings');

        // Open modal
        settingsBtn.addEventListener('click', () => {
            modal.classList.add('show');
            this.loadSettingsToModal();
        });

        // Close modal
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        cancelBtn.addEventListener('click', () => modal.classList.remove('show'));

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Toggle custom timer visibility
        document.getElementById('timeControl').addEventListener('change', (e) => {
            const customTimer = document.getElementById('customTimer');
            if (e.target.value === 'custom') {
                customTimer.classList.add('show');
            } else {
                customTimer.classList.remove('show');
            }
        });

        // Toggle timer options visibility
        document.getElementById('enableTimer').addEventListener('change', (e) => {
            const timerOptions = document.getElementById('timerOptions');
            timerOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        // Toggle handicap options visibility
        document.getElementById('enableHandicap').addEventListener('change', (e) => {
            const handicapOptions = document.getElementById('handicapOptions');
            handicapOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        // Apply settings
        applyBtn.addEventListener('click', () => {
            this.applySettings();
            modal.classList.remove('show');
            this.resetGame();
        });
    }

    loadSettingsToModal() {
        document.getElementById('enableTimer').checked = this.settings.timerEnabled;
        document.getElementById('timerOptions').style.display = this.settings.timerEnabled ? 'block' : 'none';
        document.getElementById('timeControl').value = this.settings.timeControl;
        document.getElementById('customMinutes').value = this.settings.customMinutes;
        document.getElementById('customIncrement').value = this.settings.customIncrement;
        document.getElementById('boardTheme').value = this.settings.boardTheme;
        document.getElementById('enableSounds').checked = this.settings.soundsEnabled;
        document.getElementById('enableAnimations').checked = this.settings.animationsEnabled;
        document.getElementById('enableChess960').checked = this.settings.chess960;
        document.getElementById('enableHandicap').checked = this.settings.handicapEnabled;
        document.getElementById('handicapOptions').style.display = this.settings.handicapEnabled ? 'block' : 'none';
        document.getElementById('handicapSide').value = this.settings.handicapSide;

        // Load handicap pieces
        document.querySelectorAll('.handicap-piece').forEach(cb => {
            cb.checked = this.settings.handicapPieces.includes(cb.value);
        });
    }

    applySettings() {
        this.settings.timerEnabled = document.getElementById('enableTimer').checked;
        this.settings.timeControl = document.getElementById('timeControl').value;
        this.settings.customMinutes = parseInt(document.getElementById('customMinutes').value);
        this.settings.customIncrement = parseInt(document.getElementById('customIncrement').value);
        this.settings.boardTheme = document.getElementById('boardTheme').value;
        this.settings.soundsEnabled = document.getElementById('enableSounds').checked;
        this.settings.animationsEnabled = document.getElementById('enableAnimations').checked;
        this.settings.chess960 = document.getElementById('enableChess960').checked;
        this.settings.handicapEnabled = document.getElementById('enableHandicap').checked;
        this.settings.handicapSide = document.getElementById('handicapSide').value;

        // Get handicap pieces
        this.settings.handicapPieces = Array.from(document.querySelectorAll('.handicap-piece:checked'))
            .map(cb => cb.value);

        // Apply visual changes
        this.applyBoardTheme();

        // Set up timer
        if (this.settings.timerEnabled) {
            this.initializeTimer();
        }
    }

    initializeTimer() {
        const timeControls = {
            'bullet1': { time: 60000, increment: 0 },
            'bullet2': { time: 120000, increment: 1000 },
            'blitz3': { time: 180000, increment: 0 },
            'blitz5': { time: 300000, increment: 0 },
            'rapid10': { time: 600000, increment: 0 },
            'rapid15': { time: 900000, increment: 10000 },
            'classical30': { time: 1800000, increment: 0 },
            'custom': {
                time: this.settings.customMinutes * 60000,
                increment: this.settings.customIncrement * 1000
            }
        };

        const control = timeControls[this.settings.timeControl];
        this.timers.white = control.time;
        this.timers.black = control.time;
        this.timers.increment = control.increment;
        this.timers.activeTimer = null;
        this.timers.lastUpdate = null;

        document.getElementById('timerDisplay').style.display = 'flex';
        this.updateTimerDisplay();
    }

    startTimer(color) {
        if (!this.settings.timerEnabled) return;

        // Stop any existing timer
        if (this.timers.activeTimer) {
            clearInterval(this.timers.activeTimer);
        }

        this.timers.lastUpdate = Date.now();
        this.timers.activeTimer = setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.timers.lastUpdate;
            this.timers.lastUpdate = now;

            this.timers[color] -= elapsed;

            if (this.timers[color] <= 0) {
                this.timers[color] = 0;
                this.handleTimeOut(color);
            }

            this.updateTimerDisplay();
        }, 100);
    }

    stopTimer() {
        if (this.timers.activeTimer) {
            clearInterval(this.timers.activeTimer);
            this.timers.activeTimer = null;
        }
    }

    addIncrement(color) {
        if (!this.settings.timerEnabled) return;
        this.timers[color] += this.timers.increment;
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const formatTime = (ms) => {
            const totalSeconds = Math.ceil(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        const whiteTimer = document.getElementById('whiteTimer');
        const blackTimer = document.getElementById('blackTimer');

        whiteTimer.querySelector('.timer-time').textContent = formatTime(this.timers.white);
        blackTimer.querySelector('.timer-time').textContent = formatTime(this.timers.black);

        // Add visual indicators
        whiteTimer.classList.remove('active', 'warning', 'danger');
        blackTimer.classList.remove('active', 'warning', 'danger');

        if (this.currentPlayer === 'white' && !this.gameOver) {
            whiteTimer.classList.add('active');
            if (this.timers.white < 30000) whiteTimer.classList.add('danger');
            else if (this.timers.white < 60000) whiteTimer.classList.add('warning');
        } else if (this.currentPlayer === 'black' && !this.gameOver) {
            blackTimer.classList.add('active');
            if (this.timers.black < 30000) blackTimer.classList.add('danger');
            else if (this.timers.black < 60000) blackTimer.classList.add('warning');
        }
    }

    handleTimeOut(color) {
        this.stopTimer();
        this.gameOver = true;
        this.sounds.gameOver();
        const winner = color === 'white' ? 'Black' : 'White';
        this.updateStatus(`Time out! ${winner} wins!`);
    }

    generateChess960Position() {
        // Generate a random Chess960 starting position
        // Rules: bishops on opposite colors, king between rooks

        const position = Array(8).fill(null);

        // Place bishops on opposite colors
        const lightSquares = [1, 3, 5, 7];
        const darkSquares = [0, 2, 4, 6];

        const lightBishop = lightSquares[Math.floor(Math.random() * lightSquares.length)];
        const darkBishop = darkSquares[Math.floor(Math.random() * darkSquares.length)];

        position[lightBishop] = 'b';
        position[darkBishop] = 'b';

        // Place queen
        const emptySquares = position.map((p, i) => p === null ? i : -1).filter(i => i >= 0);
        const queenPos = emptySquares[Math.floor(Math.random() * emptySquares.length)];
        position[queenPos] = 'q';

        // Place knights
        const emptySquares2 = position.map((p, i) => p === null ? i : -1).filter(i => i >= 0);
        const knight1 = emptySquares2[Math.floor(Math.random() * emptySquares2.length)];
        position[knight1] = 'n';

        const emptySquares3 = position.map((p, i) => p === null ? i : -1).filter(i => i >= 0);
        const knight2 = emptySquares3[Math.floor(Math.random() * emptySquares3.length)];
        position[knight2] = 'n';

        // Place rooks and king (king must be between rooks)
        const emptySquares4 = position.map((p, i) => p === null ? i : -1).filter(i => i >= 0);
        position[emptySquares4[0]] = 'r';
        position[emptySquares4[1]] = 'k';
        position[emptySquares4[2]] = 'r';

        return position;
    }

    applyHandicap() {
        if (!this.settings.handicapEnabled) return;

        const side = this.settings.handicapSide;
        const pieces = this.settings.handicapPieces;
        const row = side === 'white' ? 7 : 0;

        pieces.forEach(pieceType => {
            switch (pieceType) {
                case 'Q':
                    // Remove queen
                    const queenCol = this.board[row].indexOf(side === 'white' ? 'Q' : 'q');
                    if (queenCol >= 0) this.board[row][queenCol] = '.';
                    break;
                case 'R':
                    // Remove both rooks
                    for (let col = 0; col < 8; col++) {
                        if (this.board[row][col] === (side === 'white' ? 'R' : 'r')) {
                            this.board[row][col] = '.';
                        }
                    }
                    break;
                case 'B':
                    // Remove both bishops
                    for (let col = 0; col < 8; col++) {
                        if (this.board[row][col] === (side === 'white' ? 'B' : 'b')) {
                            this.board[row][col] = '.';
                        }
                    }
                    break;
                case 'N':
                    // Remove both knights
                    for (let col = 0; col < 8; col++) {
                        if (this.board[row][col] === (side === 'white' ? 'N' : 'n')) {
                            this.board[row][col] = '.';
                        }
                    }
                    break;
                case 'P':
                    // Remove all pawns
                    const pawnRow = side === 'white' ? 6 : 1;
                    for (let col = 0; col < 8; col++) {
                        this.board[pawnRow][col] = '.';
                    }
                    break;
            }
        });
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;

        // If viewing history, don't allow moves
        if (this.viewingHistoryIndex !== null) return;

        // If it's AI's turn (and we're in AI mode), don't allow clicks
        if (this.settings.gameMode === 'ai' && this.currentPlayer === 'black') return;

        const piece = this.board[row][col];

        // If a square is already selected
        if (this.selectedSquare) {
            const validMove = this.validMoves.find(m => m.toRow === row && m.toCol === col);

            if (validMove) {
                // Execute the move
                this.makeMove(validMove);
                this.clearSelection();

                // Check game state
                if (!this.gameOver && this.settings.gameMode === 'ai') {
                    // AI's turn
                    setTimeout(() => this.makeAIMove(), 500);
                }
            } else if (piece !== '.' && this.isPlayerPiece(piece, this.currentPlayer)) {
                // Select a different piece
                this.selectSquare(row, col);
            } else {
                // Deselect
                this.clearSelection();
            }
        } else {
            // Select a piece if it belongs to the current player
            if (piece !== '.' && this.isPlayerPiece(piece, this.currentPlayer)) {
                this.selectSquare(row, col);
            }
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = { row, col };
        this.validMoves = this.getValidMoves(row, col);
        this.highlightSquares();
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.highlightSquares();
    }

    highlightSquares() {
        // Remove all highlights
        document.querySelectorAll('.square').forEach(sq => {
            sq.classList.remove('selected', 'valid-move', 'valid-capture');
        });

        // Highlight selected square
        if (this.selectedSquare) {
            const { row, col } = this.selectedSquare;
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            square.classList.add('selected');

            // Highlight valid moves
            this.validMoves.forEach(move => {
                const targetSquare = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
                if (move.capture) {
                    targetSquare.classList.add('valid-capture');
                } else {
                    targetSquare.classList.add('valid-move');
                }
            });
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (piece === '.') return [];

        const color = this.isWhitePiece(piece) ? 'white' : 'black';
        let moves = [];

        const pieceType = piece.toUpperCase();

        switch (pieceType) {
            case 'P':
                moves = this.getPawnMoves(row, col, color);
                break;
            case 'N':
                moves = this.getKnightMoves(row, col, color);
                break;
            case 'B':
                moves = this.getBishopMoves(row, col, color);
                break;
            case 'R':
                moves = this.getRookMoves(row, col, color);
                break;
            case 'Q':
                moves = this.getQueenMoves(row, col, color);
                break;
            case 'K':
                moves = this.getKingMoves(row, col, color);
                break;
        }

        // Filter out moves that would put own king in check
        return moves.filter(move => !this.wouldBeInCheck(move, color));
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Forward move
        if (this.isValidSquare(row + direction, col) && this.board[row + direction][col] === '.') {
            moves.push({ fromRow: row, fromCol: col, toRow: row + direction, toCol: col, capture: false });

            // Double move from starting position
            if (row === startRow && this.board[row + 2 * direction][col] === '.') {
                moves.push({ fromRow: row, fromCol: col, toRow: row + 2 * direction, toCol: col, capture: false });
            }
        }

        // Captures
        [-1, 1].forEach(dc => {
            const newRow = row + direction;
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target !== '.' && this.isPlayerPiece(target, color === 'white' ? 'black' : 'white')) {
                    moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: true });
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        offsets.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target === '.' || this.isPlayerPiece(target, color === 'white' ? 'black' : 'white')) {
                    moves.push({
                        fromRow: row, fromCol: col,
                        toRow: newRow, toCol: newCol,
                        capture: target !== '.'
                    });
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    getRookMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    getQueenMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ]);
    }

    getKingMoves(row, col, color) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        offsets.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target === '.' || this.isPlayerPiece(target, color === 'white' ? 'black' : 'white')) {
                    moves.push({
                        fromRow: row, fromCol: col,
                        toRow: newRow, toCol: newCol,
                        capture: target !== '.'
                    });
                }
            }
        });

        return moves;
    }

    getSlidingMoves(row, col, color, directions) {
        const moves = [];

        directions.forEach(([dr, dc]) => {
            let newRow = row + dr;
            let newCol = col + dc;

            while (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];

                if (target === '.') {
                    moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: false });
                } else {
                    if (this.isPlayerPiece(target, color === 'white' ? 'black' : 'white')) {
                        moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: true });
                    }
                    break;
                }

                newRow += dr;
                newCol += dc;
            }
        });

        return moves;
    }

    isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isWhitePiece(piece) {
        return piece === piece.toUpperCase();
    }

    isPlayerPiece(piece, player) {
        if (player === 'white') {
            return this.isWhitePiece(piece);
        } else {
            return !this.isWhitePiece(piece);
        }
    }

    makeMove(move) {
        const { fromRow, fromCol, toRow, toCol } = move;
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // If viewing history, return to present first
        if (this.viewingHistoryIndex !== null) {
            this.returnToPresent();
        }

        // Save current state to full game history before making move
        this.saveGameState();

        // Save move for history
        const moveData = {
            move: move,
            capturedPiece: capturedPiece,
            piece: piece
        };
        this.moveHistory.push(moveData);

        // Play sound effect
        if (capturedPiece !== '.') {
            this.sounds.capture();
        } else {
            this.sounds.move();
        }

        // Handle capture
        if (capturedPiece !== '.') {
            const captureColor = this.isWhitePiece(capturedPiece) ? 'white' : 'black';
            this.capturedPieces[captureColor].push(capturedPiece);
            this.updateCapturedPieces();
        }

        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '.';

        // Check for pawn promotion
        if (piece.toUpperCase() === 'P') {
            if ((this.isWhitePiece(piece) && toRow === 0) || (!this.isWhitePiece(piece) && toRow === 7)) {
                // Show promotion dialog
                this.pendingPromotion = { row: toRow, col: toCol, isWhite: this.isWhitePiece(piece) };
                this.showPromotionDialog(toRow, toCol);
                return; // Wait for promotion choice before continuing
            }
        }

        this.completeMoveAfterPromotion();
    }

    completeMoveAfterPromotion() {
        // Timer management
        if (this.settings.timerEnabled) {
            this.stopTimer();
            this.addIncrement(this.currentPlayer);
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Start timer for next player
        if (this.settings.timerEnabled && !this.gameOver) {
            this.startTimer(this.currentPlayer);
        }

        // Update UI
        this.initializeBoard();
        this.updateMoveHistory(this.moveHistory[this.moveHistory.length - 1]);
        this.checkGameOver();

        // Play check sound if applicable
        if (this.isInCheck(this.currentPlayer) && !this.gameOver) {
            this.sounds.check();
        }
    }

    showPromotionDialog(row, col) {
        const modal = document.getElementById('promotionModal');
        const piecesContainer = document.getElementById('promotionPieces');
        piecesContainer.innerHTML = '';

        const isWhite = this.isWhitePiece(this.board[row][col]);
        const pieces = isWhite ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];

        pieces.forEach(piece => {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'promotion-piece';
            pieceDiv.textContent = PIECES[piece];
            pieceDiv.addEventListener('click', () => {
                this.handlePromotion(piece);
            });
            piecesContainer.appendChild(pieceDiv);
        });

        modal.classList.add('show');
    }

    handlePromotion(promotedPiece) {
        if (!this.pendingPromotion) return;

        const { row, col } = this.pendingPromotion;
        this.board[row][col] = promotedPiece;

        // Close modal
        document.getElementById('promotionModal').classList.remove('show');
        this.pendingPromotion = null;

        // Continue with the move
        this.completeMoveAfterPromotion();
    }

    saveGameState() {
        // Save a snapshot of the current game state
        const state = {
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            capturedPieces: {
                white: [...this.capturedPieces.white],
                black: [...this.capturedPieces.black]
            },
            gameOver: this.gameOver
        };
        this.fullGameHistory.push(state);
    }

    jumpToMove(moveIndex) {
        // Can't jump while in the middle of a game
        if (!this.gameOver && this.currentPlayer === 'black') {
            return; // Don't allow during AI's turn
        }

        this.stopTimer();
        this.viewingHistoryIndex = moveIndex;

        // Load the game state after this move
        if (moveIndex < 0 || this.fullGameHistory.length === 0) {
            // Jump to initial position
            this.loadInitialPosition();
        } else if (moveIndex < this.fullGameHistory.length) {
            const state = this.fullGameHistory[moveIndex];
            this.loadGameState(state);
        }

        // Update UI to show we're viewing history
        document.getElementById('viewingPast').style.display = 'flex';

        // Highlight the selected move
        this.highlightMoveInHistory(moveIndex);

        // Disable interactions
        this.initializeBoard();
    }

    loadGameState(state) {
        this.board = state.board.map(row => [...row]);
        this.currentPlayer = state.currentPlayer;
        this.capturedPieces = {
            white: [...state.capturedPieces.white],
            black: [...state.capturedPieces.black]
        };
        this.gameOver = state.gameOver;
        this.updateCapturedPieces();
    }

    loadInitialPosition() {
        // Load the starting position
        if (this.fullGameHistory.length > 0) {
            this.loadGameState(this.fullGameHistory[0]);
        }
    }

    returnToPresent() {
        this.viewingHistoryIndex = null;
        document.getElementById('viewingPast').style.display = 'none';

        // Restore the latest game state
        if (this.fullGameHistory.length > 0) {
            const latestState = this.fullGameHistory[this.fullGameHistory.length - 1];
            this.loadGameState(latestState);
        }

        this.highlightMoveInHistory(this.moveHistory.length - 1);
        this.initializeBoard();

        // Restart timer if game is ongoing
        if (!this.gameOver && this.settings.timerEnabled) {
            this.startTimer(this.currentPlayer);
        }
    }

    highlightMoveInHistory(activeIndex) {
        const moveItems = document.querySelectorAll('.move-item');
        moveItems.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    wouldBeInCheck(move, color) {
        // Simulate the move
        const { fromRow, fromCol, toRow, toCol } = move;
        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '.';

        const inCheck = this.isInCheck(color);

        // Undo the move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = target;

        return inCheck;
    }

    isInCheck(color) {
        // Find king position
        let kingRow, kingCol;
        const kingPiece = color === 'white' ? 'K' : 'k';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === kingPiece) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== undefined) break;
        }

        // Check if any opponent piece can attack the king
        const opponentColor = color === 'white' ? 'black' : 'white';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece !== '.' && this.isPlayerPiece(piece, opponentColor)) {
                    const moves = this.getValidMovesWithoutCheckTest(row, col, opponentColor);
                    if (moves.some(m => m.toRow === kingRow && m.toCol === kingCol)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getValidMovesWithoutCheckTest(row, col, color) {
        const piece = this.board[row][col];
        if (piece === '.') return [];

        const pieceType = piece.toUpperCase();

        switch (pieceType) {
            case 'P': return this.getPawnMoves(row, col, color);
            case 'N': return this.getKnightMoves(row, col, color);
            case 'B': return this.getBishopMoves(row, col, color);
            case 'R': return this.getRookMoves(row, col, color);
            case 'Q': return this.getQueenMoves(row, col, color);
            case 'K': return this.getKingMoves(row, col, color);
            default: return [];
        }
    }

    getAllValidMoves(color) {
        const moves = [];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece !== '.' && this.isPlayerPiece(piece, color)) {
                    moves.push(...this.getValidMoves(row, col));
                }
            }
        }

        return moves;
    }

    checkGameOver() {
        const validMoves = this.getAllValidMoves(this.currentPlayer);

        if (validMoves.length === 0) {
            if (this.isInCheck(this.currentPlayer)) {
                // Checkmate
                this.gameOver = true;
                this.stopTimer();
                this.sounds.gameOver();
                const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
                this.updateStatus(`Checkmate! ${winner} wins!`);
            } else {
                // Stalemate
                this.gameOver = true;
                this.stopTimer();
                this.sounds.gameOver();
                this.updateStatus('Stalemate! Game is a draw.');
            }
        } else if (this.isInCheck(this.currentPlayer)) {
            this.updateStatus(`${this.currentPlayer === 'white' ? 'White' : 'Black'} is in check!`);
        }
    }

    updateStatus(message = null) {
        const statusElement = document.getElementById('status');
        if (message) {
            statusElement.textContent = message;
        } else {
            const player = this.currentPlayer === 'white' ? 'White' : 'Black';
            statusElement.textContent = `${player}'s turn`;
        }
    }

    updateCapturedPieces() {
        const capturedWhite = document.getElementById('capturedWhite');
        const capturedBlack = document.getElementById('capturedBlack');

        capturedWhite.innerHTML = this.capturedPieces.white.map(p => PIECES[p]).join(' ');
        capturedBlack.innerHTML = this.capturedPieces.black.map(p => PIECES[p]).join(' ');
    }

    updateMoveHistory(moveData) {
        const moveList = document.getElementById('moveList');
        const { move, piece } = moveData;
        const from = String.fromCharCode(97 + move.fromCol) + (8 - move.fromRow);
        const to = String.fromCharCode(97 + move.toCol) + (8 - move.toRow);
        const moveText = `${PIECES[piece]} ${from} → ${to}`;

        const moveItem = document.createElement('div');
        moveItem.className = 'move-item';
        moveItem.textContent = `${this.moveHistory.length}. ${moveText}`;

        // Make move clickable
        const moveIndex = this.moveHistory.length - 1;
        moveItem.addEventListener('click', () => this.jumpToMove(moveIndex));

        moveList.appendChild(moveItem);
        moveList.scrollTop = moveList.scrollHeight;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        // Stop timer
        this.stopTimer();

        // Undo AI move if it was the last move
        if (this.currentPlayer === 'white' && this.moveHistory.length > 0) {
            this.undoLastMove();
        }

        // Undo player move
        if (this.moveHistory.length > 0) {
            this.undoLastMove();
        }

        this.gameOver = false;
        this.clearSelection();

        // Restart timer for current player
        if (this.settings.timerEnabled) {
            this.startTimer(this.currentPlayer);
        }
    }

    undoLastMove() {
        const lastMove = this.moveHistory.pop();
        const { move, capturedPiece, piece } = lastMove;

        // Move piece back
        this.board[move.fromRow][move.fromCol] = piece;
        this.board[move.toRow][move.toCol] = capturedPiece;

        // Restore captured piece
        if (capturedPiece !== '.') {
            const captureColor = this.isWhitePiece(capturedPiece) ? 'white' : 'black';
            const index = this.capturedPieces[captureColor].indexOf(capturedPiece);
            if (index > -1) {
                this.capturedPieces[captureColor].splice(index, 1);
            }
        }

        // Switch player back
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Update UI
        this.initializeBoard();
        this.updateCapturedPieces();

        const moveList = document.getElementById('moveList');
        if (moveList.lastChild) {
            moveList.removeChild(moveList.lastChild);
        }
    }

    resetGame() {
        // Stop any running timer
        this.stopTimer();

        // Reset to standard position
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        // Apply Chess960 if enabled
        if (this.settings.chess960) {
            const blackPos = this.generateChess960Position();
            const whitePos = blackPos.map(p => p ? p.toUpperCase() : p);
            this.board[0] = blackPos;
            this.board[7] = whitePos;
        }

        // Apply handicap if enabled
        this.applyHandicap();

        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.gameOver = false;

        // Reset history tracking
        this.viewingHistoryIndex = null;
        this.fullGameHistory = [];
        this.saveGameState(); // Save initial position

        // Reset timer if enabled
        if (this.settings.timerEnabled) {
            this.initializeTimer();
            this.startTimer('white');
        } else {
            document.getElementById('timerDisplay').style.display = 'none';
        }

        this.initializeBoard();
        this.updateCapturedPieces();
        document.getElementById('moveList').innerHTML = '';
        document.getElementById('viewingPast').style.display = 'none';
    }

    // ========== GAME CODE ENCODING/DECODING ==========

    setupGameCodeHandlers() {
        document.getElementById('generateCode').addEventListener('click', () => {
            const code = this.encodeGameState();
            document.getElementById('gameCode').value = code;
        });

        document.getElementById('copyCode').addEventListener('click', () => {
            const codeInput = document.getElementById('gameCode');
            codeInput.select();
            document.execCommand('copy');

            // Visual feedback
            const btn = document.getElementById('copyCode');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });

        document.getElementById('loadCode').addEventListener('click', () => {
            const code = document.getElementById('loadCodeInput').value.trim();
            if (code) {
                try {
                    this.decodeAndLoadGameState(code);
                    document.getElementById('loadCodeInput').value = '';
                } catch (error) {
                    alert('Invalid game code! Please check and try again.');
                    console.error('Error loading game code:', error);
                }
            }
        });

        document.getElementById('returnToPresent').addEventListener('click', () => {
            this.returnToPresent();
        });
    }

    encodeGameState() {
        // Encode current game state into a compact alphanumeric string
        // Format: BOARD|PLAYER|CAPTURED_WHITE|CAPTURED_BLACK

        // Encode board (compress empty squares)
        let boardStr = '';
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece === '.') {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        boardStr += emptyCount;
                        emptyCount = 0;
                    }
                    boardStr += piece;
                }
            }
            if (emptyCount > 0) {
                boardStr += emptyCount;
            }
            if (row < 7) boardStr += '/';
        }

        // Encode current player (w or b)
        const playerChar = this.currentPlayer === 'white' ? 'w' : 'b';

        // Encode captured pieces
        const capturedWhite = this.capturedPieces.white.join('');
        const capturedBlack = this.capturedPieces.black.join('');

        // Combine all parts
        const fullState = `${boardStr}|${playerChar}|${capturedWhite}|${capturedBlack}`;

        // Convert to base36 for compactness
        const encoded = this.stringToBase36(fullState);

        return encoded;
    }

    stringToBase36(str) {
        // Convert string to hexadecimal then to base36
        let hex = '';
        for (let i = 0; i < str.length; i++) {
            hex += str.charCodeAt(i).toString(16).padStart(2, '0');
        }

        // Split into chunks and convert each to base36
        const chunks = [];
        const chunkSize = 10; // Process 10 hex chars at a time
        for (let i = 0; i < hex.length; i += chunkSize) {
            const chunk = hex.substr(i, chunkSize);
            const num = parseInt(chunk, 16);
            chunks.push(num.toString(36));
        }

        return chunks.join('-');
    }

    base36ToString(base36Str) {
        // Convert base36 back to string
        const chunks = base36Str.split('-');
        let hex = '';

        for (const chunk of chunks) {
            const num = parseInt(chunk, 36);
            hex += num.toString(16).padStart(10, '0');
        }

        // Convert hex to string
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            const charCode = parseInt(hex.substr(i, 2), 16);
            if (charCode > 0) {
                str += String.fromCharCode(charCode);
            }
        }

        return str;
    }

    decodeAndLoadGameState(code) {
        // Decode the base36 string
        const fullState = this.base36ToString(code);
        const parts = fullState.split('|');

        if (parts.length !== 4) {
            throw new Error('Invalid game code format');
        }

        const [boardStr, playerChar, capturedWhite, capturedBlack] = parts;

        // Stop timer
        this.stopTimer();

        // Decode board
        const rows = boardStr.split('/');
        this.board = [];

        for (const rowStr of rows) {
            const row = [];
            for (let i = 0; i < rowStr.length; i++) {
                const char = rowStr[i];
                if (char >= '1' && char <= '8') {
                    // Empty squares
                    const count = parseInt(char);
                    for (let j = 0; j < count; j++) {
                        row.push('.');
                    }
                } else {
                    // Piece
                    row.push(char);
                }
            }
            this.board.push(row);
        }

        // Decode player
        this.currentPlayer = playerChar === 'w' ? 'white' : 'black';

        // Decode captured pieces
        this.capturedPieces.white = capturedWhite ? capturedWhite.split('') : [];
        this.capturedPieces.black = capturedBlack ? capturedBlack.split('') : [];

        // Reset other game state
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.gameOver = false;
        this.viewingHistoryIndex = null;
        this.fullGameHistory = [];
        this.saveGameState(); // Save this loaded state

        // Update UI
        this.initializeBoard();
        this.updateCapturedPieces();
        document.getElementById('moveList').innerHTML = '';
        document.getElementById('viewingPast').style.display = 'none';
        this.updateStatus();

        // Check if loaded position is game over
        this.checkGameOver();
    }

    // ========== AI MINIMAX IMPLEMENTATION ==========

    makeAIMove() {
        if (this.gameOver || this.currentPlayer !== 'black') return;

        this.updateStatus('AI is thinking...');
        document.getElementById('status').classList.add('thinking');

        setTimeout(() => {
            const bestMove = this.getBestMove();

            if (bestMove) {
                this.makeMove(bestMove);
            }

            document.getElementById('status').classList.remove('thinking');

            if (!this.gameOver) {
                this.updateStatus();
            }
        }, 100);
    }

    getBestMove() {
        const depth = this.aiDifficulty;
        let bestMove = null;
        let bestValue = -Infinity;
        const alpha = -Infinity;
        const beta = Infinity;

        const moves = this.getAllValidMoves('black');

        // Shuffle moves for variety
        moves.sort(() => Math.random() - 0.5);

        for (const move of moves) {
            // Make move
            const { fromRow, fromCol, toRow, toCol } = move;
            const piece = this.board[fromRow][fromCol];
            const target = this.board[toRow][toCol];

            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = '.';

            // Evaluate
            const value = this.minimax(depth - 1, alpha, beta, false);

            // Undo move
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = target;

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        // Check terminal conditions
        if (depth === 0) {
            return this.evaluateBoard();
        }

        const color = isMaximizing ? 'black' : 'white';
        const moves = this.getAllValidMoves(color);

        // Checkmate or stalemate
        if (moves.length === 0) {
            if (this.isInCheck(color)) {
                // Checkmate - huge penalty/bonus
                return isMaximizing ? -100000 : 100000;
            } else {
                // Stalemate
                return 0;
            }
        }

        if (isMaximizing) {
            let maxEval = -Infinity;

            for (const move of moves) {
                // Make move
                const { fromRow, fromCol, toRow, toCol } = move;
                const piece = this.board[fromRow][fromCol];
                const target = this.board[toRow][toCol];

                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = '.';

                // Recurse
                const evaluation = this.minimax(depth - 1, alpha, beta, false);

                // Undo move
                this.board[fromRow][fromCol] = piece;
                this.board[toRow][toCol] = target;

                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);

                if (beta <= alpha) {
                    break; // Beta cutoff
                }
            }

            return maxEval;
        } else {
            let minEval = Infinity;

            for (const move of moves) {
                // Make move
                const { fromRow, fromCol, toRow, toCol } = move;
                const piece = this.board[fromRow][fromCol];
                const target = this.board[toRow][toCol];

                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = '.';

                // Recurse
                const evaluation = this.minimax(depth - 1, alpha, beta, true);

                // Undo move
                this.board[fromRow][fromCol] = piece;
                this.board[toRow][toCol] = target;

                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);

                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }

            return minEval;
        }
    }

    evaluateBoard() {
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece === '.') continue;

                const pieceType = piece.toUpperCase();
                const isWhite = this.isWhitePiece(piece);

                // Material value
                score += PIECE_VALUES[piece];

                // Position bonus
                if (POSITION_BONUS[pieceType]) {
                    const posRow = isWhite ? row : 7 - row;
                    const posValue = POSITION_BONUS[pieceType][posRow][col];
                    score += isWhite ? posValue : -posValue;
                }
            }
        }

        return score;
    }
}

// Initialize game when DOM is loaded
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ChessGame();
});
