import express from 'express';
import cors from 'cors';
import chat from './controllers/chat';

require('dotenv').config();

const port = process.env.PORT || 8000;

// Express App
const app = express();
const http = require('http').createServer(app);

// Socket io Server
const io = require('socket.io')(http, {
    path: '/socket.io',
    cors: {
        origin: [process.env.DOMNAIN],
        methods: ['GET', 'POST'],
        allowedHeaders: ['content-type'],
    }
});

// middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rest API
app.get('/api', (req, res) => {
    res.send('Ahoy from CONNECTAR REST API!');
});

// Socket
chat(io);

// Server
http.listen(port, () => console.log(`Server listening on ${port}!`));