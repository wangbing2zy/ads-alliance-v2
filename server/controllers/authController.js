import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

/**
 * AuthController - 认证控制器
 * Handles login, logout, and current user info.
 */
export class AuthController {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} logService - LogService instance
   */
  constructor(db, logService) {
    this.userModel = new UserModel(db);
    this.logService = logService;
  }

  /** Handle user login */
  handleLogin = (req, res) => {
    try {
      const { username, password } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      if (!username || !password) {
        return res.status(400).json({
          code: 1,
          data: null,
          message: '用户名和密码不能为空',
        });
      }

      const user = this.userModel.verifyPassword(username, password);
      if (!user) {
        // Log failed login
        if (this.logService) {
          this.logService.writeLoginLog({
            user_id: null,
            username,
            action: 'login_failed',
            ip,
            user_agent: userAgent,
            detail: '密码错误',
          });
        }
        return res.status(401).json({
          code: 1,
          data: null,
          message: '用户名或密码错误',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log successful login
      if (this.logService) {
        this.logService.writeLoginLog({
          user_id: user.id,
          username: user.username,
          action: 'login',
          ip,
          user_agent: userAgent,
        });
      }

      res.json({
        code: 0,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Handle user logout */
  handleLogout = (req, res) => {
    try {
      if (req.user && this.logService) {
        this.logService.writeLoginLog({
          user_id: req.user.id,
          username: req.user.username,
          action: 'logout',
          ip: req.ip || req.headers['x-forwarded-for'] || null,
        });
      }
      res.json({ code: 0, data: null, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get current user info */
  handleMe = (req, res) => {
    try {
      if (!req.user || req.user.role === 'guest') {
        return res.json({
          code: 0,
          data: {
            id: null,
            username: '访客',
            role: 'guest',
          },
          message: 'ok',
        });
      }

      const user = this.userModel.findById(req.user.id);
      if (!user) {
        return res.json({
          code: 0,
          data: {
            id: null,
            username: '访客',
            role: 'guest',
          },
          message: 'ok',
        });
      }

      res.json({
        code: 0,
        data: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        message: 'ok',
      });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
