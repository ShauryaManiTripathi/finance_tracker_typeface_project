import { Request, Response } from 'express';
import { authService } from './auth.service';
import { RegisterInput, LoginInput } from './auth.validators';
import { logger } from '../../utils/logger';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User with this email already exists') {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
        });
        return;
      }

      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  }

  /**
   * Login an existing user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid email or password') {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
        });
        return;
      }

      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const user = await authService.getProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
        });
        return;
      }

      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch user profile',
      });
    }
  }
}

export const authController = new AuthController();
