import { VideoModel } from '../models/videoModel.js';
import { VideoMetaService } from '../services/videoMetaService.js';

/**
 * VideoController - 视频管理控制器
 * Handles video CRUD and metadata fetching.
 */
export class VideoController {
  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    this.videoModel = new VideoModel(db);
    this.videoMetaService = new VideoMetaService();
  }

  /** Get paginated video list */
  handleList = (req, res) => {
    try {
      const { site, status, search, page, pageSize } = req.query;
      const user_id = req.user?.role !== 'guest' ? req.user.id : undefined;

      const result = this.videoModel.findAll({
        site,
        status,
        search,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
        user_id,
      });
      res.json({ code: 0, data: result, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Get a single video by ID */
  handleGetById = (req, res) => {
    try {
      const video = this.videoModel.findById(parseInt(req.params.id, 10));
      if (!video) {
        return res.status(404).json({ code: 1, data: null, message: '视频不存在' });
      }
      res.json({ code: 0, data: video, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Create a new video */
  handleCreate = (req, res) => {
    try {
      const { url, title, duration, site } = req.body;
      if (!url) {
        return res.status(400).json({ code: 1, data: null, message: '视频 URL 不能为空' });
      }

      const detectedSite = site || this.videoMetaService.detectSite(url);
      const video = this.videoModel.create({
        user_id: req.user?.id || 1,
        url,
        title: title || null,
        duration: duration || null,
        site: detectedSite,
      });
      res.status(201).json({ code: 0, data: video, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Update a video */
  handleUpdate = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const video = this.videoModel.findById(id);
      if (!video) {
        return res.status(404).json({ code: 1, data: null, message: '视频不存在' });
      }
      const updated = this.videoModel.update(id, req.body);
      res.json({ code: 0, data: updated, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Delete a video (soft delete) */
  handleDelete = (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = this.videoModel.delete(id);
      if (!success) {
        return res.status(404).json({ code: 1, data: null, message: '视频不存在' });
      }
      res.json({ code: 0, data: null, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };

  /** Fetch video metadata from URL */
  handleFetchMeta = async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ code: 1, data: null, message: 'URL 不能为空' });
      }

      const meta = await this.videoMetaService.fetchMeta(url);
      res.json({ code: 0, data: { url, ...meta }, message: 'ok' });
    } catch (err) {
      res.status(500).json({ code: 3, data: null, message: err.message });
    }
  };
}
