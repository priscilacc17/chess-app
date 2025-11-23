const request = require('supertest');
const { app, games, playerSessions, ChessGame, generateGameId, isTestMode } = require('../server/server');

describe('Server Integration Tests', () => {
  beforeEach(() => {
    // Limpiar estado antes de cada test
    games.clear();
    playerSessions.clear();
  });

  test('debe estar en modo test', () => {
    expect(isTestMode).toBe(true);
  });

  test('GET /health debe retornar status OK en modo test', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.mode).toBe('test');
  });

  test('debe manejar correctamente el almacenamiento de partidas', () => {
    const game = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
    games.set('TEST123', game);
    
    expect(games.has('TEST123')).toBe(true);
    expect(games.get('TEST123')).toBe(game);
  });

  test('generateGameId debe generar IDs únicos', () => {
    const id1 = generateGameId();
    const id2 = generateGameId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBe(6);
    expect(id2.length).toBe(6);
  });

  test('debe manejar sesiones de jugadores', () => {
    playerSessions.set('player1', 'socket123');
    playerSessions.set('player2', 'socket456');
    
    expect(playerSessions.get('player1')).toBe('socket123');
    expect(playerSessions.get('player2')).toBe('socket456');
    expect(playerSessions.has('player3')).toBe(false);
  });

  test('las rutas HTTP deben funcionar correctamente', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<!DOCTYPE html>');
  });
});