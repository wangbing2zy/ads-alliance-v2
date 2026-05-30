import { TaskModel } from '../models/taskModel.js';
import { ExecutionLogModel } from '../models/executionLogModel.js';

/**
 * TaskController - 任务管理控制器
 * Handles task CRUD, start/stop/pause, and log queries.
 */
export class TaskController {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} taskEngine - TaskEngine instance
   */
  constructor(db, taskEngine) {
    this.taskModel = new TaskModel(db);
    this.logModel = new ExecutionLogModel(db);
    this.taskEngine = taskEngine;
  }

  /** Get all tasks */
  handleList = (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.role !== 'guest' ? req.user.id : null;
      const tasks = this.taskModel.findAll({ status, userId });
      res.json({ code: 0, data: tasks, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get a single task with recent logs */
  handleGetById = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const task = this.taskModel.findById(id);
      if (!task) {
        return res.status(404).json({ code: 1, data: null, message: '任务不存在' });
      }

      // Include runtime status if task is running
      const runtimeInfo = this.taskEngine.getTaskStatus(id);
      const result = { ...task, runtime: runtimeInfo };

      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Create a new task */
  handleCreate = (req, res) => {
    try {
      const { name, video_urls, ad_rule_json, proxy_ids, rotate_mode, concurrency, interval_min_sec, interval_max_sec } = req.body;
      if (!name || !video_urls || !Array.isArray(video_urls) || video_urls.length === 0) {
        return res.status(400).json({ code: 1, data: null, message: 'name 和 video_urls 为必填项' });
      }
      const userId = req.user?.role !== 'guest' ? req.user.id : null;
      const task = this.taskModel.create({
        name,
        video_urls,
        ad_rule_json: ad_rule_json || null,
        proxy_ids: proxy_ids || [],
        rotate_mode: rotate_mode || 'sequential',
        concurrency: concurrency || 1,
        interval_min_sec: interval_min_sec ?? 30,
        interval_max_sec: interval_max_sec ?? 120,
        user_id: userId,
      });
      res.status(201).json({ code: 0, data: task, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update a task */
  handleUpdate = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const task = this.taskModel.findById(id);
      if (!task) {
        return res.status(404).json({ code: 1, data: null, message: '任务不存在' });
      }
      if (task.status === 'running') {
        return res.status(400).json({ code: 2, data: null, message: '运行中的任务不能编辑，请先停止' });
      }
      const updated = this.taskModel.update(id, req.body);
      res.json({ code: 0, data: updated, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Delete a task */
  handleDelete = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const task = this.taskModel.findById(id);
      if (!task) {
        return res.status(404).json({ code: 1, data: null, message: '任务不存在' });
      }
      if (task.status === 'running') {
        return res.status(400).json({ code: 2, data: null, message: '运行中的任务不能删除，请先停止' });
      }
      this.taskModel.delete(id);
      res.json({ code: 0, data: null, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Start a task */
  handleStart = async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await this.taskEngine.startTask(id);
      res.json({ code: 0, data: { status: 'running' }, message: 'ok' });
    } catch (err) {
      const code = err.message.includes('不存在') ? 1 : 2;
      res.status(400).json({ code, data: null, message: err.message });
    }
  };

  /** Stop a task */
  handleStop = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      this.taskEngine.stopTask(id);
      res.json({ code: 0, data: { status: 'stopped' }, message: 'ok' });
    } catch (err) {
      res.status(400).json({ code: 2, data: null, message: err.message });
    }
  };

  /** Pause a task */
  handlePause = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      this.taskEngine.pauseTask(id);
      res.json({ code: 0, data: { status: 'paused' }, message: 'ok' });
    } catch (err) {
      res.status(400).json({ code: 2, data: null, message: err.message });
    }
  };

  /** Get task execution logs */
  handleGetLogs = (req, res) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      const { page, pageSize, action } = req.query;
      const result = this.logModel.findByTask(taskId, {
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        action,
      });
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get task runtime status (current IP, play count, etc.) */
  handleGetRuntime = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const runtimeInfo = this.taskEngine.getTaskStatus(id);
      if (!runtimeInfo) {
        return res.json({ code: 0, data: { taskId: id, status: 'stopped' }, message: 'ok' });
      }
      res.json({ code: 0, data: runtimeInfo, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
