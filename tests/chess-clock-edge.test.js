const ChessClock = require('../server/chess-clock');

describe('Chess Clock Edge Cases', () => {
  let clock;

  afterEach(() => {
    if (clock) clock.destroy();
  });

  test('debe manejar múltiples startTimer calls', (done) => {
    clock = new ChessClock({ base: 1, increment: 0 });
    
    let callCount = 0;
    const callback = () => {
      callCount++;
      if (callCount === 1) {
        clock.stopTimers();
        expect(callCount).toBe(1);
        done();
      }
    };

    clock.startTimer('white', callback);
    clock.startTimer('white', callback); // Segundo call debería detener el primero
  });

  test('debe manejar forceStopTimers correctamente', () => {
    clock = new ChessClock({ base: 10, increment: 0 });
    
    clock.startTimer('white', () => {});
    expect(clock.timers.white).toBeDefined();
    
    clock.forceStopTimers();
    expect(clock.timers.white).toBeNull();
    expect(clock.timers.black).toBeNull();
  });

  test('debe manejar switchTurn sin incremento', () => {
    clock = new ChessClock({ base: 300, increment: 0 });
    const initialTime = clock.whiteTime;
    
    clock.switchTurn();
    expect(clock.whiteTime).toBe(initialTime); // Sin cambio por incremento 0
  });

  test('debe retornar null en getWinnerByTime sin tiempo agotado', () => {
    clock = new ChessClock({ base: 300, increment: 0 });
    expect(clock.getWinnerByTime()).toBeNull();
  });
});