import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Button, Paper, TextField, MenuItem, Select, FormControl, InputLabel, Slider } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TaskForm from '../components/task/TaskForm';
import AdRuleEditor from '../components/task/AdRuleEditor';
import ProxySelector from '../components/task/ProxySelector';
import { useTaskStore } from '../stores/taskStore';
import { useProxyStore } from '../stores/proxyStore';
import type { AdRule } from '../types';

/**
 * TaskEditorPage - Task creation/editing page with 4 sections:
 * 1. Basic info + video URLs
 * 2. Ad interaction rules
 * 3. Proxy selection
 * 4. Execution config
 */
export default function TaskEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();

  const { currentTask, loadTaskById, createTask, updateTask } = useTaskStore();
  const { proxies, loadProxies } = useProxyStore();

  const [name, setName] = useState('');
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [adRule, setAdRule] = useState<AdRule>({
    playButtonSelector: '.play-btn',
    adWaitMinSec: 3,
    adWaitMaxSec: 10,
    adCloseMode: 'auto',
    adCloseSelector: '',
    videoCompleteSelector: '.video-ended',
    pageLoadTimeout: 30000,
  });
  const [proxyIds, setProxyIds] = useState<number[]>([]);
  const [rotateMode, setRotateMode] = useState<'sequential' | 'random'>('sequential');
  const [concurrency, setConcurrency] = useState(1);
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(120);

  useEffect(() => {
    loadProxies({ pageSize: 999 }); // Load all proxies for selection
    if (isEdit && id) {
      loadTaskById(parseInt(id, 10));
    }
  }, [isEdit, id, loadTaskById, loadProxies]);

  useEffect(() => {
    if (isEdit && currentTask) {
      setName(currentTask.name);
      setVideoUrls(currentTask.video_urls.length > 0 ? currentTask.video_urls : ['']);
      setAdRule(currentTask.ad_rule_json || adRule);
      setProxyIds(currentTask.proxy_ids);
      setRotateMode(currentTask.rotate_mode);
      setConcurrency(currentTask.concurrency);
      setIntervalMin(currentTask.interval_min_sec);
      setIntervalMax(currentTask.interval_max_sec);
    }
  }, [isEdit, currentTask]);

  const handleSave = async () => {
    if (!name || videoUrls.every((u) => !u.trim())) {
      alert('请填写任务名称和至少一个视频URL');
      return;
    }

    const taskData = {
      name,
      video_urls: videoUrls.filter((u) => u.trim()),
      ad_rule_json: adRule,
      proxy_ids: proxyIds,
      rotate_mode: rotateMode,
      concurrency,
      interval_min_sec: intervalMin,
      interval_max_sec: intervalMax,
    };

    try {
      if (isEdit && id) {
        await updateTask(parseInt(id, 10), taskData);
      } else {
        await createTask(taskData);
      }
      navigate('/tasks');
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tasks')}>
          返回
        </Button>
        <Typography variant="h5" fontWeight={700}>
          {isEdit ? '编辑任务' : '创建任务'}
        </Typography>
      </Box>

      {/* Section 1: Basic info + video URLs */}
      <TaskForm
        name={name}
        onNameChange={setName}
        videoUrls={videoUrls}
        onVideoUrlsChange={setVideoUrls}
      />

      {/* Section 2: Ad interaction rules */}
      <AdRuleEditor rule={adRule} onChange={setAdRule} />

      {/* Section 3: Proxy selection */}
      <ProxySelector
        proxies={proxies}
        selectedIds={proxyIds}
        onSelectionChange={setProxyIds}
      />

      {/* Section 4: Execution config */}
      <Paper sx={{ p: 2.5, mt: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          执行配置
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>轮换模式</InputLabel>
              <Select
                value={rotateMode}
                label="轮换模式"
                onChange={(e) => setRotateMode(e.target.value as any)}
              >
                <MenuItem value="sequential">顺序轮换</MenuItem>
                <MenuItem value="random">随机轮换</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="并发数"
              type="number"
              value={concurrency}
              onChange={(e) => setConcurrency(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              size="small"
              sx={{ width: 120 }}
              helperText="1-20"
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              播放间隔: {intervalMin}s ~ {intervalMax}s
            </Typography>
            <Slider
              value={[intervalMin, intervalMax]}
              onChange={(_, v) => {
                const [min, max] = v as number[];
                setIntervalMin(min);
                setIntervalMax(max);
              }}
              min={5}
              max={600}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}s`}
            />
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate('/tasks')}>
          取消
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!name || videoUrls.every((u) => !u.trim())}
        >
          {isEdit ? '更新' : '创建'}
        </Button>
      </Box>
    </Box>
  );
}
