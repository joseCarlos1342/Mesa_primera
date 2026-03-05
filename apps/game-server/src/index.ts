import { Server } from 'colyseus';
import express from 'express';
import { createServer } from 'http';

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(express.json());

const gameServer = new Server({
  server: createServer(app)
});

gameServer.listen(port);
console.log(`[GameServer] Listening on ws://localhost:${port}`);
