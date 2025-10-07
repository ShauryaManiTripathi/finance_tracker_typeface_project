import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { agentController } from './agent.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /agent/chat
 * Chat with financial AI agent
 */
router.post('/chat', agentController.chat.bind(agentController));

export default router;
