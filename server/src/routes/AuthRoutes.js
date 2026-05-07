import express from 'express';
import { login, register, logout, refresh } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.post('/refresh', refresh);

export default router;