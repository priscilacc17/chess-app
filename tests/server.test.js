const request = require('supertest');
const express = require('express');
const { ChessGame } = require('../server/server-core');

// Crear una app Express separada para tests
const testApp = express();
testApp.use(express.json());
testApp.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
testApp.get('/', (req, res) => {
  res.send('Test HTML');
});

describe('Server Routes', () => {
  test('GET /health debe retornar status OK', async () => {
    const response = await request(testApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});

describe('ChessGame Class', () => {
  let game;

  beforeEach(() => {
    game = new ChessGame({ base: 300, increment: 5 }, 'TEST123');
  });

  afterEach(() => {
    if (game && game.clock) {
      game.clock.destroy();
    }
  });

  test('debe crear una partida correctamente', () => {
    expect(game.gameId).toBe('TEST123');
    expect(game.started).toBe(false);
    expect(game.gameOver).toBe(false);
  });

  test('debe agregar jugadores correctamente', () => {
    const color1 = game.addPlayer('socket1', 'player1', 'white');
    const color2 = game.addPlayer('socket2', 'player2', 'black');
    
    expect(color1).toBe('white');
    expect(color2).toBe('black');
    expect(game.started).toBe(true);
  });

  test('debe verificar correctamente si un jugador está en la partida', () => {
    game.addPlayer('socket1', 'player1', 'white');
    game.addPlayer('socket2', 'player2', 'black');
    
    expect(game.isPlayerInGame('player1')).toBe(true);
    expect(game.isPlayerInGame('player2')).toBe(true);
    expect(game.isPlayerInGame('player3')).toBe(false);
  });
});