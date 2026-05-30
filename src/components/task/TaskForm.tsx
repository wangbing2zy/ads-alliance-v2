import React from 'react';
import {
  TextField,
  Typography,
  Box,
  IconButton,
  Button,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface TaskFormProps {
  name: string;
  onNameChange: (name: string) => void;
  videoUrls: string[];
  onVideoUrlsChange: (urls: string[]) => void;
}

/**
 * TaskForm - Task basic information and video URL form.
 */
export default function TaskForm({ name, onNameChange, videoUrls, onVideoUrlsChange }: TaskFormProps) {
  const handleAddUrl = () => {
    onVideoUrlsChange([...videoUrls, '']);
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...videoUrls];
    newUrls[index] = value;
    onVideoUrlsChange(newUrls);
  };

  const handleRemoveUrl = (index: number) => {
    onVideoUrlsChange(videoUrls.filter((_, i) => i !== index));
  };

  return (
    <Paper sx={{ p: 2.5, mb: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        基本信息
      </Typography>
      <TextField
        label="任务名称"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        fullWidth
        required
        size="small"
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          视频 URL 列表
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddUrl}>
          添加 URL
        </Button>
      </Box>

      {videoUrls.map((url, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            value={url}
            onChange={(e) => handleUrlChange(index, e.target.value)}
            placeholder={`视频 URL #${index + 1}`}
            fullWidth
            size="small"
          />
          <IconButton
            size="small"
            color="error"
            onClick={() => handleRemoveUrl(index)}
            disabled={videoUrls.length <= 1}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Paper>
  );
}
