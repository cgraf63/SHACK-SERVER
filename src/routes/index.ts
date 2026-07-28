import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

export default router;
