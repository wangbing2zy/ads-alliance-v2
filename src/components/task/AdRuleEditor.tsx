import React from 'react';
import {
  TextField,
  Typography,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  Slider,
} from '@mui/material';
import type { AdRule } from '../../types';

interface AdRuleEditorProps {
  rule: AdRule;
  onChange: (rule: AdRule) => void;
}

/**
 * AdRuleEditor - Form editor for ad interaction rules.
 * Includes CSS selectors, timing, close mode, and timeout settings.
 */
export default function AdRuleEditor({ rule, onChange }: AdRuleEditorProps) {
  const handleChange = (field: keyof AdRule, value: any) => {
    onChange({ ...rule, [field]: value });
  };

  return (
    <Paper sx={{ p: 2.5, mb: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        广告交互规则
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="播放按钮选择器"
          value={rule.playButtonSelector}
          onChange={(e) => handleChange('playButtonSelector', e.target.value)}
          placeholder=".play-btn, button[aria-label*='play']"
          fullWidth
          size="small"
          helperText="CSS 选择器，用于定位视频播放按钮"
        />

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            广告等待时间: {rule.adWaitMinSec}s ~ {rule.adWaitMaxSec}s
          </Typography>
          <Slider
            value={[rule.adWaitMinSec, rule.adWaitMaxSec]}
            onChange={(_, v) => {
              const [min, max] = v as number[];
              handleChange('adWaitMinSec', min);
              handleChange('adWaitMaxSec', max);
            }}
            min={1}
            max={30}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}s`}
          />
        </Box>

        <FormControl>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            广告关闭方式
          </Typography>
          <RadioGroup
            row
            value={rule.adCloseMode}
            onChange={(e) => handleChange('adCloseMode', e.target.value)}
          >
            <FormControlLabel value="auto" control={<Radio size="small" />} label="自动等待" />
            <FormControlLabel value="selector" control={<Radio size="small" />} label="点击关闭按钮" />
          </RadioGroup>
        </FormControl>

        {rule.adCloseMode === 'selector' && (
          <TextField
            label="广告关闭按钮选择器"
            value={rule.adCloseSelector}
            onChange={(e) => handleChange('adCloseSelector', e.target.value)}
            placeholder=".ad-close-btn, button.skip-ad"
            fullWidth
            size="small"
            helperText="CSS 选择器，用于定位广告关闭/跳过按钮"
          />
        )}

        <TextField
          label="视频完成选择器"
          value={rule.videoCompleteSelector}
          onChange={(e) => handleChange('videoCompleteSelector', e.target.value)}
          placeholder=".video-ended, .player-complete"
          fullWidth
          size="small"
          helperText="视频播放完成的标识元素选择器"
        />

        <TextField
          label="页面加载超时(ms)"
          type="number"
          value={rule.pageLoadTimeout}
          onChange={(e) => handleChange('pageLoadTimeout', parseInt(e.target.value, 10) || 30000)}
          size="small"
          sx={{ width: 200 }}
          helperText="页面加载最大等待时间"
        />
      </Box>
    </Paper>
  );
}
