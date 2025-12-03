import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

// Sound Manager using Web Audio API
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicPlaying = false;
    this.musicOscillators = [];
  }

  init() {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain nodes
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = 0.15;
    this.musicGain.connect(this.audioContext.destination);

    this.sfxGain = this.audioContext.createGain();
    this.sfxGain.gain.value = 0.3;
    this.sfxGain.connect(this.audioContext.destination);
  }

  // Play a simple tone
  playTone(frequency, duration, type = 'sine', gainNode = null) {
    if (!this.audioContext) this.init();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);

    return osc;
  }

  // Sound effects
  playMove() {
    this.playTone(440, 0.1, 'square');
  }

  playCollectTree() {
    this.playTone(523, 0.1, 'sine');
    setTimeout(() => this.playTone(659, 0.1, 'sine'), 50);
    setTimeout(() => this.playTone(784, 0.15, 'sine'), 100);
  }

  playDefeatTreant() {
    this.playTone(330, 0.15, 'sawtooth');
    setTimeout(() => this.playTone(220, 0.2, 'sawtooth'), 100);
  }

  playWin() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine'), i * 150);
    });
  }

  playLose() {
    this.playTone(294, 0.3, 'sawtooth');
    setTimeout(() => this.playTone(262, 0.3, 'sawtooth'), 200);
    setTimeout(() => this.playTone(220, 0.5, 'sawtooth'), 400);
  }

  playPortal() {
    // Magical sound
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(400 + i * 100, 0.2, 'sine');
      }, i * 80);
    }
  }

  playClick() {
    this.playTone(600, 0.08, 'square');
  }

  // Background music - simple looping melody
  startMusic() {
    if (!this.audioContext) this.init();
    if (this.musicPlaying) return;

    this.musicPlaying = true;
    this.playMusicLoop();
  }

  playMusicLoop() {
    if (!this.musicPlaying) return;

    // Simple forest-like melody
    const melody = [
      { freq: 262, dur: 0.4 }, // C4
      { freq: 294, dur: 0.4 }, // D4
      { freq: 330, dur: 0.4 }, // E4
      { freq: 294, dur: 0.4 }, // D4
      { freq: 262, dur: 0.4 }, // C4
      { freq: 247, dur: 0.4 }, // B3
      { freq: 262, dur: 0.8 }, // C4
      { freq: 0, dur: 0.4 },   // rest
    ];

    let time = 0;
    melody.forEach(note => {
      if (note.freq > 0) {
        setTimeout(() => {
          if (this.musicPlaying) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.value = note.freq;

            gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.dur * 0.9);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start();
            osc.stop(this.audioContext.currentTime + note.dur);
          }
        }, time * 1000);
      }
      time += note.dur;
    });

    // Loop the melody
    setTimeout(() => {
      if (this.musicPlaying) {
        this.playMusicLoop();
      }
    }, time * 1000);
  }

  stopMusic() {
    this.musicPlaying = false;
  }

  setMusicVolume(vol) {
    if (this.musicGain) {
      this.musicGain.gain.value = vol;
    }
  }

  setSfxVolume(vol) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = vol;
    }
  }
}

const soundManager = new SoundManager();

// Game constants
const GRID_COLS = 8;
const GRID_ROWS = 10;
const CELL_SIZE = 40;
const TREANT_COUNT = 8;

// Game states
const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  GUIDE: 'guide',
  WIN: 'win',
  LOSE: 'lose'
};

// Cell types
const CELL_TYPE = {
  EMPTY: 'empty',
  TREE: 'tree',
  TREANT: 'treant',
  PORTAL: 'portal'
};

// Pixel art components using CSS
function PixelEmils(props) {
  return (
    <div
      class={`relative ${props.class || ''}`}
      style={{
        width: props.size || '32px',
        height: props.size || '32px',
        "image-rendering": "pixelated"
      }}
    >
      <svg viewBox="0 0 16 16" class="w-full h-full">
        {/* Emils - cyan blob */}
        <rect x="2" y="6" width="12" height="8" fill="#00d4ff" />
        <rect x="1" y="8" width="1" height="4" fill="#00d4ff" />
        <rect x="14" y="8" width="1" height="4" fill="#00d4ff" />
        <rect x="3" y="5" width="10" height="1" fill="#00d4ff" />
        <rect x="4" y="4" width="8" height="1" fill="#00d4ff" />
        {/* Highlight */}
        <rect x="3" y="6" width="10" height="2" fill="#66e5ff" />
        {/* Eyes */}
        <rect x="5" y="9" width="2" height="3" fill="#fff" />
        <rect x="9" y="9" width="2" height="3" fill="#fff" />
      </svg>
    </div>
  );
}

function PixelTree(props) {
  return (
    <div
      class={props.class || ''}
      style={{
        width: props.size || '32px',
        height: props.size || '32px',
        "image-rendering": "pixelated"
      }}
    >
      <svg viewBox="0 0 16 16" class="w-full h-full">
        {/* Tree - dark green */}
        <rect x="4" y="2" width="8" height="3" fill="#2d8a2d" />
        <rect x="3" y="5" width="10" height="3" fill="#2d8a2d" />
        <rect x="2" y="8" width="12" height="4" fill="#2d8a2d" />
        <rect x="3" y="12" width="10" height="2" fill="#2d8a2d" />
        {/* Highlight */}
        <rect x="5" y="3" width="6" height="2" fill="#3da83d" />
        <rect x="4" y="6" width="8" height="2" fill="#3da83d" />
        <rect x="3" y="9" width="10" height="2" fill="#3da83d" />
      </svg>
    </div>
  );
}

function PixelTreant(props) {
  return (
    <div
      class={props.class || ''}
      style={{
        width: props.size || '32px',
        height: props.size || '32px',
        "image-rendering": "pixelated"
      }}
    >
      <svg viewBox="0 0 16 16" class="w-full h-full">
        {/* Treant - angry tree */}
        <rect x="4" y="2" width="8" height="3" fill="#2d8a2d" />
        <rect x="3" y="5" width="10" height="3" fill="#2d8a2d" />
        <rect x="2" y="8" width="12" height="4" fill="#2d8a2d" />
        <rect x="3" y="12" width="10" height="2" fill="#2d8a2d" />
        {/* Angry eyes - red */}
        <rect x="4" y="6" width="3" height="2" fill="#ff3333" />
        <rect x="9" y="6" width="3" height="2" fill="#ff3333" />
        {/* Angry mouth */}
        <rect x="5" y="10" width="6" height="1" fill="#ff3333" />
      </svg>
    </div>
  );
}

function PixelPortal(props) {
  return (
    <div
      class={props.class || ''}
      style={{
        width: props.size || '32px',
        height: props.size || '40px',
        "image-rendering": "pixelated"
      }}
    >
      <svg viewBox="0 0 16 20" class="w-full h-full">
        {/* Portal - purple oval */}
        <ellipse cx="8" cy="10" rx="6" ry="8" fill="#9966ff" />
        <ellipse cx="8" cy="10" rx="4" ry="6" fill="#cc99ff" />
        <ellipse cx="8" cy="10" rx="2" ry="3" fill="#eeddff" />
      </svg>
    </div>
  );
}

function generateBoard() {
  const board = Array(GRID_ROWS).fill(null).map(() =>
    Array(GRID_COLS).fill(null).map(() => ({
      type: CELL_TYPE.TREE,
      revealed: false,
      adjacentTreants: 0
    }))
  );

  // Place portal at top center
  const portalCol = Math.floor(GRID_COLS / 2);
  board[0][portalCol].type = CELL_TYPE.PORTAL;

  // Place treants randomly (not on portal row or player start area)
  let treantPlaced = 0;
  while (treantPlaced < TREANT_COUNT) {
    const row = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
    const col = Math.floor(Math.random() * GRID_COLS);

    if (board[row][col].type === CELL_TYPE.TREE) {
      board[row][col].type = CELL_TYPE.TREANT;
      treantPlaced++;
    }
  }

  // Calculate adjacent treant counts
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (board[row][col].type !== CELL_TYPE.TREANT) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
              if (board[nr][nc].type === CELL_TYPE.TREANT) {
                count++;
              }
            }
          }
        }
        board[row][col].adjacentTreants = count;
      }
    }
  }

  return board;
}

export default function EmilsViewport(props) {
  const [gameState, setGameState] = createSignal(GAME_STATE.MENU);
  const [board, setBoard] = createSignal([]);
  const [playerPos, setPlayerPos] = createSignal({ row: GRID_ROWS - 1, col: Math.floor(GRID_COLS / 2) });
  const [treesCollected, setTreesCollected] = createSignal(0);
  const [treantsCaught, setTreantsCaught] = createSignal(0);

  const handleExit = () => {
    soundManager.playClick();
    if (props.api && typeof props.api.exit === 'function') {
      props.api.exit();
    }
  };

  const startGame = () => {
    const newBoard = generateBoard();
    const startRow = GRID_ROWS - 1;
    const startCol = Math.floor(GRID_COLS / 2);
    newBoard[startRow][startCol].revealed = true;
    newBoard[startRow][startCol].type = CELL_TYPE.EMPTY;

    setBoard(newBoard);
    setPlayerPos({ row: startRow, col: startCol });
    setTreesCollected(0);
    setTreantsCaught(0);
    setGameState(GAME_STATE.PLAYING);

    // Start background music
    soundManager.startMusic();
  };

  const movePlayer = (dRow, dCol) => {
    if (gameState() !== GAME_STATE.PLAYING) return;

    const pos = playerPos();
    const newRow = pos.row + dRow;
    const newCol = pos.col + dCol;

    if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) return;

    const newBoard = [...board().map(row => [...row.map(cell => ({ ...cell }))])];
    const targetCell = newBoard[newRow][newCol];

    if (targetCell.type === CELL_TYPE.TREANT) {
      if (treesCollected() > 0) {
        setTreesCollected(t => t - 1);
        setTreantsCaught(t => t + 1);
        targetCell.type = CELL_TYPE.EMPTY;
        targetCell.revealed = true;
        soundManager.playDefeatTreant();
      } else {
        targetCell.revealed = true;
        setBoard(newBoard);
        setGameState(GAME_STATE.LOSE);
        soundManager.stopMusic();
        soundManager.playLose();
        return;
      }
    } else if (targetCell.type === CELL_TYPE.TREE) {
      setTreesCollected(t => t + 1);
      targetCell.type = CELL_TYPE.EMPTY;
      targetCell.revealed = true;
      soundManager.playCollectTree();
    } else if (targetCell.type === CELL_TYPE.PORTAL) {
      targetCell.revealed = true;
      setBoard(newBoard);
      setPlayerPos({ row: newRow, col: newCol });
      setGameState(GAME_STATE.WIN);
      soundManager.stopMusic();
      soundManager.playWin();
      return;
    } else {
      targetCell.revealed = true;
      soundManager.playMove();
    }

    setBoard(newBoard);
    setPlayerPos({ row: newRow, col: newCol });
  };

  const handleKeyDown = (e) => {
    if (gameState() !== GAME_STATE.PLAYING) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault();
        movePlayer(-1, 0);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault();
        movePlayer(1, 0);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        movePlayer(0, -1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault();
        movePlayer(0, 1);
        break;
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    soundManager.stopMusic();
  });

  const getNumberColor = (num) => {
    const colors = {
      1: '#4CAF50',
      2: '#FFC107',
      3: '#FF9800',
      4: '#F44336',
      5: '#9C27B0',
      6: '#00BCD4',
      7: '#795548',
      8: '#607D8B'
    };
    return colors[num] || '#FFC107';
  };

  const renderBoard = () => {
    const currentBoard = board();
    const pos = playerPos();

    return (
      <div
        class="relative"
        style={{
          width: `${GRID_COLS * CELL_SIZE}px`,
          height: `${GRID_ROWS * CELL_SIZE}px`,
          "background-color": '#2d5a27'
        }}
      >
        <For each={currentBoard}>
          {(row, rowIndex) => (
            <For each={row}>
              {(cell, colIndex) => {
                const isPlayer = pos.row === rowIndex() && pos.col === colIndex();

                return (
                  <div
                    class="absolute flex items-center justify-center"
                    style={{
                      width: `${CELL_SIZE}px`,
                      height: `${CELL_SIZE}px`,
                      left: `${colIndex() * CELL_SIZE}px`,
                      top: `${rowIndex() * CELL_SIZE}px`
                    }}
                  >
                    <Show when={!cell.revealed}>
                      <PixelTree size="32px" />
                    </Show>

                    <Show when={cell.revealed && cell.type === CELL_TYPE.PORTAL}>
                      <PixelPortal size="32px" />
                    </Show>

                    <Show when={cell.revealed && cell.type === CELL_TYPE.TREANT}>
                      <PixelTreant size="32px" />
                    </Show>

                    <Show when={cell.revealed && cell.type === CELL_TYPE.EMPTY && cell.adjacentTreants > 0 && !isPlayer}>
                      <span
                        class="font-bold text-xl"
                        style={{
                          color: getNumberColor(cell.adjacentTreants),
                          "text-shadow": "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        {cell.adjacentTreants}
                      </span>
                    </Show>

                    <Show when={isPlayer}>
                      <PixelEmils size="32px" class="z-10" />
                    </Show>
                  </div>
                );
              }}
            </For>
          )}
        </For>
      </div>
    );
  };

  return (
    <div
      class="w-full h-full flex flex-col items-center justify-center"
      style={{ "background-color": "#2d5a27" }}
    >
      {/* Main Menu */}
      <Show when={gameState() === GAME_STATE.MENU}>
        <div class="flex flex-col items-center gap-6 p-8">
          <div class="text-center mb-4">
            <PixelEmils size="128px" class="mx-auto mb-4" />
            <h1
              class="text-5xl font-bold text-white mb-2"
              style={{ "text-shadow": "3px 3px 0 #1a3a17" }}
            >
              EMILS
            </h1>
            <p class="text-white/70 text-sm">A Minesweeper-like Adventure</p>
          </div>

          <div class="flex flex-col gap-4">
            <button
              onClick={() => { soundManager.playClick(); startGame(); }}
              class="px-8 py-4 text-xl font-bold text-white rounded-lg transition-transform hover:scale-105 active:scale-95"
              style={{
                "background-color": "#4a9c3d",
                "box-shadow": "0 4px 0 #2d5a27"
              }}
            >
              PLAY
            </button>
            <button
              onClick={() => { soundManager.playClick(); setGameState(GAME_STATE.GUIDE); }}
              class="px-8 py-4 text-xl font-bold text-white rounded-lg transition-transform hover:scale-105 active:scale-95"
              style={{
                "background-color": "#4a9c3d",
                "box-shadow": "0 4px 0 #2d5a27"
              }}
            >
              HELP
            </button>
            <button
              onClick={handleExit}
              class="px-8 py-4 text-xl font-bold text-white rounded-lg transition-transform hover:scale-105 active:scale-95"
              style={{
                "background-color": "#e91e63",
                "box-shadow": "0 4px 0 #ad1457"
              }}
            >
              EXIT
            </button>
          </div>
        </div>
      </Show>

      {/* Guide Screen */}
      <Show when={gameState() === GAME_STATE.GUIDE}>
        <div
          class="flex flex-col items-center gap-4 p-6 rounded-2xl max-w-md"
          style={{ "background-color": "#f5c842" }}
        >
          <h2 class="text-2xl font-bold mb-2">GUIDES</h2>
          <div class="text-left space-y-2 text-sm">
            <p>1. Use Arrow Keys or WASD to move.</p>
            <p>2. Walk into trees to collect them.</p>
            <p>3. Numbers show nearby hidden Treants.</p>
            <p>4. Use trees to defeat Treants safely.</p>
            <p>5. Reach the Portal to win!</p>
            <p>6. Hit a Treant without trees = Game Over!</p>
          </div>
          <div class="flex gap-6 mt-4">
            <div class="flex flex-col items-center gap-1">
              <PixelTree size="40px" />
              <span class="text-xs">Tree</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <PixelTreant size="40px" />
              <span class="text-xs">Treant</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <PixelPortal size="40px" />
              <span class="text-xs">Portal</span>
            </div>
          </div>
          <button
            onClick={() => { soundManager.playClick(); setGameState(GAME_STATE.MENU); }}
            class="mt-4 px-6 py-3 rounded-lg font-bold text-white"
            style={{ "background-color": "#e91e63" }}
          >
            BACK
          </button>
        </div>
      </Show>

      {/* Playing State */}
      <Show when={gameState() === GAME_STATE.PLAYING}>
        <div class="flex flex-col items-center gap-4">
          {/* Stats */}
          <div class="flex justify-between w-full px-4 mb-2 gap-8">
            <div class="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <PixelTree size="24px" />
              <span class="text-white font-bold text-lg">x {treesCollected()}</span>
            </div>
            <div class="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
              <PixelTreant size="24px" />
              <span class="text-white font-bold text-lg">x {treantsCaught()}</span>
            </div>
          </div>

          {/* Game Board */}
          <div class="border-4 border-green-900 rounded-lg overflow-hidden shadow-2xl">
            {renderBoard()}
          </div>

          {/* Controls hint */}
          <div class="text-white/70 text-sm mt-2">
            Use Arrow Keys or WASD to move
          </div>

          {/* Menu button */}
          <button
            onClick={() => { soundManager.playClick(); soundManager.stopMusic(); setGameState(GAME_STATE.MENU); }}
            class="mt-2 px-4 py-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
          >
            Menu
          </button>
        </div>
      </Show>

      {/* Win Screen */}
      <Show when={gameState() === GAME_STATE.WIN}>
        <div
          class="flex flex-col items-center gap-6 p-8 rounded-2xl"
          style={{ "background-color": "#f5c842" }}
        >
          <h2 class="text-3xl font-bold">YOU WIN!</h2>
          <p class="text-4xl">:)</p>
          <PixelEmils size="64px" />
          <div class="text-sm space-y-1">
            <p>Trees Collected: {treesCollected()}</p>
            <p>Treants Defeated: {treantsCaught()}</p>
          </div>
          <div class="flex gap-4">
            <button
              onClick={() => { soundManager.playClick(); setGameState(GAME_STATE.MENU); }}
              class="px-6 py-3 rounded-lg font-bold text-white"
              style={{ "background-color": "#e91e63" }}
            >
              HOME
            </button>
            <button
              onClick={() => { soundManager.playClick(); startGame(); }}
              class="px-6 py-3 rounded-lg font-bold text-white"
              style={{ "background-color": "#e91e63" }}
            >
              RETRY
            </button>
          </div>
        </div>
      </Show>

      {/* Lose Screen */}
      <Show when={gameState() === GAME_STATE.LOSE}>
        <div
          class="flex flex-col items-center gap-6 p-8 rounded-2xl"
          style={{ "background-color": "#f5c842" }}
        >
          <h2 class="text-3xl font-bold">YOU LOSE!</h2>
          <p class="text-4xl">:(</p>
          <PixelTreant size="64px" />
          <div class="flex gap-4">
            <button
              onClick={() => { soundManager.playClick(); setGameState(GAME_STATE.MENU); }}
              class="px-6 py-3 rounded-lg font-bold text-white"
              style={{ "background-color": "#e91e63" }}
            >
              HOME
            </button>
            <button
              onClick={() => { soundManager.playClick(); startGame(); }}
              class="px-6 py-3 rounded-lg font-bold text-white"
              style={{ "background-color": "#e91e63" }}
            >
              RETRY
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
