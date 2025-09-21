// backend/server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './src/config/index.js'; // Merkezi config'i import et
import chatRoutes from './src/routes/chatRoutes.js';

// ES Modülleri için __dirname ayarı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/chat', chatRoutes);

app.listen(config.port, () => console.log(`Server listening on http://localhost:${config.port}`));