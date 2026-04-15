import { Router } from 'express';

const router = Router();

let closures = [];

router.get('/', (req, res) => {
    res.json(closures);
});

router.post('/', (req, res) => {
    const closure = {
        id: crypto.randomUUID(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    closures.push(closure);
    res.status(201).json(closure);
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    closures = closures.filter(c => c.id !== id);
    res.status(204).send();
});

export default router;