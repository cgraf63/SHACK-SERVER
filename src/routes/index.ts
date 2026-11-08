import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


router.get('/qso-log', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'qso-log.html'
        )
    );
});



/* Mobile app (PWA) */
router.get('/m', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'm.html'
        )
    );
});

router.get('/dxcc', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'dxcc.html'
        )
    );
});

router.get('/dxpeditions', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'dxpeditions.html'
        )
    );
});

router.get('/network', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'network.html'
        )
    );
});

router.get('/diagnostics', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'diagnostics.html'
        )
    );
});


router.get('/rgo', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'rgo-remote.html'
        )
    );
});


router.get('/contest-manager', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'contest-manager.html'
        )
    );
});


router.get('/contest', (_req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '..',
            'public',
            'contest.html'
        )
    );
});
export default router;
