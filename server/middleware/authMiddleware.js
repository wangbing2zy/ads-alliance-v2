import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ads-alliance-v2-secret';

/**
 * Optional authentication middleware.
 * If a valid token is present, sets req.user with decoded payload.
 * If no token or invalid token, sets req.user = { role: 'guest' }.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.user = { role: 'guest' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (err) {
    req.user = { role: 'guest' };
  }

  next();
}

/**
 * Require authentication middleware.
 * Must have a valid token, otherwise returns 401.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '请先登录',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '登录已过期，请重新登录',
    });
  }
}

/**
 * Require admin role middleware.
 * Must have a valid token AND role === 'admin', otherwise returns 403.
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '请先登录',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '需要管理员权限',
      });
    }
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '登录已过期，请重新登录',
    });
  }
}

export { JWT_SECRET };
