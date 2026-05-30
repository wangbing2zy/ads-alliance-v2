import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../api/client';

/**
 * SettingsPage - System settings page for KDL configuration and browser settings.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data.data || {});
    } catch (err) {
      setError('加载设置失败');
    }
  };

  const handleSave = async () => {
    try {
      await apiClient.put('/settings', settings);
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('保存失败');
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/ai/test-connection');
      const data = res.data.data;
      if (data.connected) {
        setTestResult(`连接成功 (${data.model})`);
      } else {
        setTestResult(`连接失败：${data.error || '请检查API Key'}`);
      }
    } catch (err) {
      setTestResult(`连接失败：${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          系统设置
        </Typography>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
          保存设置
        </Button>
      </Box>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>设置已保存</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* KDL Configuration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              快代理 (KDL) 配置
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="订单号"
                value={settings.kdl_order_id || ''}
                onChange={(e) => handleChange('kdl_order_id', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="SecretId"
                value={settings.kdl_secret_id || ''}
                onChange={(e) => handleChange('kdl_secret_id', e.target.value)}
                size="small"
                fullWidth
                type="password"
              />
              <Typography variant="body2" color="text.secondary">
                订单号和SecretId用于从快代理API拉取代理列表。签名方式为HMAC-SHA1。
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Browser Configuration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              浏览器配置
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.headless !== 'false'}
                    onChange={(e) => handleChange('headless', e.target.checked ? 'true' : 'false')}
                  />
                }
                label="无头模式 (Headless)"
              />
              <Typography variant="body2" color="text.secondary">
                无头模式下浏览器不显示界面，适合服务器环境。关闭无头模式可用于调试。
              </Typography>
              <TextField
                label="全局最大并发数"
                type="number"
                value={settings.max_global_concurrent || '10'}
                onChange={(e) => handleChange('max_global_concurrent', e.target.value)}
                size="small"
                sx={{ width: 200 }}
                helperText="同时执行的最大播放任务数（1-50）"
              />
            </Box>
          </Paper>
        </Grid>

        {/* Proxy Auto Verify */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              代理自动验证
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="自动验证间隔（分钟）"
                type="number"
                value={settings.proxy_auto_verify_interval || '30'}
                onChange={(e) => handleChange('proxy_auto_verify_interval', e.target.value)}
                size="small"
                sx={{ width: 200 }}
                helperText="设0或留空=禁用自动验证。启动时立即执行一次，之后按间隔循环。"
                inputProps={{ min: 0, max: 1440 }}
              />
              <Typography variant="body2" color="text.secondary">
                系统将定期自动对所有代理进行健康检测，标记可用/较慢/不可用状态。
                当前所有 {settings.proxy_auto_verify_interval && parseInt(settings.proxy_auto_verify_interval) > 0
                  ? `每 ${settings.proxy_auto_verify_interval} 分钟`
                  : '手动'} 验证一次。
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* AI辅助检测 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              AI辅助检测
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ai_enabled === 'true'}
                    onChange={(e) => handleChange('ai_enabled', e.target.checked ? 'true' : 'false')}
                  />
                }
                label="启用AI检测"
              />
              <Typography variant="body2" color="text.secondary">
                AI将监控任务执行情况，在出错时自动分析原因并建议纠错动作。
              </Typography>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>AI模型</InputLabel>
                <Select
                  value={settings.ai_model || 'deepseek'}
                  label="AI模型"
                  onChange={(e) => handleChange('ai_model', e.target.value)}
                >
                  <MenuItem value="deepseek">DeepSeek</MenuItem>
                  <MenuItem value="chatgpt">ChatGPT</MenuItem>
                </Select>
              </FormControl>

              {settings.ai_model === 'deepseek' && (
                <>
                  <TextField
                    label="DeepSeek API Key"
                    value={settings.ai_deepseek_api_key || ''}
                    onChange={(e) => handleChange('ai_deepseek_api_key', e.target.value)}
                    size="small"
                    fullWidth
                    type="password"
                    placeholder="sk-..."
                  />
                  <TextField
                    label="API Base URL"
                    value={settings.ai_deepseek_base_url || 'https://api.deepseek.com'}
                    onChange={(e) => handleChange('ai_deepseek_base_url', e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="https://api.deepseek.com"
                  />
                </>
              )}

              {settings.ai_model === 'chatgpt' && (
                <>
                  <TextField
                    label="ChatGPT API Key"
                    value={settings.ai_chatgpt_api_key || ''}
                    onChange={(e) => handleChange('ai_chatgpt_api_key', e.target.value)}
                    size="small"
                    fullWidth
                    type="password"
                    placeholder="sk-..."
                  />
                  <TextField
                    label="API Base URL"
                    value={settings.ai_chatgpt_base_url || 'https://api.openai.com'}
                    onChange={(e) => handleChange('ai_chatgpt_base_url', e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="https://api.openai.com"
                  />
                </>
              )}

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="检测间隔（秒）"
                  type="number"
                  value={settings.ai_check_interval_sec || '60'}
                  onChange={(e) => handleChange('ai_check_interval_sec', e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                  helperText="AI健康检查间隔"
                />
                <TextField
                  label="每次最大Token"
                  type="number"
                  value={settings.ai_max_token_per_request || '1000'}
                  onChange={(e) => handleChange('ai_max_token_per_request', e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                  helperText="控制费用"
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleTestConnection}
                  disabled={testing}
                  startIcon={testing ? <CircularProgress size={14} /> : undefined}
                >
                  {testing ? '测试中...' : '测试连接'}
                </Button>
                {testResult && (
                  <Chip
                    label={testResult}
                    size="small"
                    color={testResult.includes('成功') ? 'success' : 'error'}
                  />
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
