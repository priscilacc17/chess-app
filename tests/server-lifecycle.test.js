const { startServer, stopServer, isTestMode } = require('../server/server');

describe('Server Lifecycle', () => {
  test('debe estar en modo test', () => {
    expect(isTestMode).toBe(true);
  });

  test('startServer no debe lanzar errores en test mode', () => {
    expect(() => startServer()).not.toThrow();
  });

  test('stopServer debe ejecutar callback', (done) => {
    stopServer(() => {
      done();
    });
  });

  test('stopServer sin callback no debe lanzar errores', () => {
    expect(() => stopServer()).not.toThrow();
  });
});