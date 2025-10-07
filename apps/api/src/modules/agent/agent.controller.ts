import { Request, Response } from 'express';
import { agentService } from './agent.service';

export class AgentController {
  /**
   * POST /agent/chat
   * Chat with AI agent
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId; // Changed from (req.user as any).id
      const { message, history } = req.body;

      console.log(`Agent chat request - UserId: ${userId}, Message: ${message}`);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Message is required and must be a string'
        });
        return;
      }

      const result = await agentService.chat(userId, message, history || []);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Agent chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to process chat request'
      });
    }
  }
}

export const agentController = new AgentController();
