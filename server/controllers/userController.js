import { UserModel } from '../models/userModel.js';

/**
 * UserController - 用户管理控制器（管理员）
 * Handles user CRUD operations for admin users.
 */
export class UserController {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.userModel = new UserModel(db);
  }

  /** Get all users */
  handleList = (req, res) => {
    try {
      const users = this.userModel.findAll();
      res.json({ code: 0, data: users, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Create a new user */
  handleCreate = (req, res) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          code: 1,
          data: null,
          message: '用户名和密码不能为空',
        });
      }

      // Check if username already exists
      const existing = this.userModel.findByUsername(username);
      if (existing) {
        return res.status(400).json({
          code: 1,
          data: null,
          message: '用户名已存在',
        });
      }

      const user = this.userModel.create({
        username,
        password,
        role: role || 'user',
      });
      res.status(201).json({ code: 0, data: user, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update a user */
  handleUpdate = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = this.userModel.findById(id);
      if (!user) {
        return res.status(404).json({ code: 1, data: null, message: '用户不存在' });
      }

      const { role, password } = req.body;
      const updated = this.userModel.update(id, { role, password });
      res.json({ code: 0, data: updated, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Delete (disable) a user */
  handleDelete = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (id === 1) {
        return res.status(400).json({
          code: 1,
          data: null,
          message: '不能删除默认管理员账号',
        });
      }

      const success = this.userModel.delete(id);
      if (!success) {
        return res.status(404).json({ code: 1, data: null, message: '用户不存在' });
      }
      res.json({ code: 0, data: null, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
