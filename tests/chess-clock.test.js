const ChessClock = require('../server/chess-clock');

describe('Chess Clock', () => {
  let clock;

  beforeEach(() => {
    clock = new ChessClock({ base: 300, increment: 5 });
  });

  afterEach(() => {
    clock.destroy();
  });

  test('debe inicializar con tiempos correctos', () => {
    const times = clock.getTimes();
    expect(times.whiteTime).toBe(300000); // 5 minutos en ms
    expect(times.blackTime).toBe(300000);
    expect(times.currentTurn).toBe('white');
  });

  test('debe disminuir el tiempo del jugador activo', (done) => {
    let timeUpdates = 0;
    
    clock.startTimer('white', (update) => {
      timeUpdates++;
      
      if (timeUpdates === 2) {
        expect(update.whiteTime).toBeLessThan(300000);
        expect(update.blackTime).toBe(300000);
        clock.stopTimers();
        done();
      }
    });
  });

  test('debe cambiar turno correctamente', () => {
    clock.switchTurn();
    expect(clock.currentTurn).toBe('black');
    
    clock.switchTurn();
    expect(clock.currentTurn).toBe('white');
  });

  test('debe aplicar incremento al cambiar turno', () => {
    const initialWhiteTime = clock.whiteTime;
    clock.switchTurn();
    
    // El tiempo blanco debería tener el incremento agregado
    expect(clock.whiteTime).toBe(initialWhiteTime + 5000);
  });

  test('debe detectar derrota por tiempo', (done) => {
    clock = new ChessClock({ base: 0.1, increment: 0 }); // 100ms para test rápido
    
    clock.startTimer('white', (update) => {
      if (update.gameOver) {
        expect(update.winner).toBe('black');
        expect(clock.isTimeUp()).toBe(true);
        expect(clock.getWinnerByTime()).toBe('black');
        done();
      }
    });
  });
});