import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Video } from '../../types';

interface VideoPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  video: Video | null;
}

/**
 * VideoPreviewDialog - Full-size dialog with iframe preview of the video.
 */
export default function VideoPreviewDialog({ open, onClose, video }: VideoPreviewDialogProps) {
  if (!video) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      sx={{ '& .MuiDialog-paper': { width: '80vw', height: '70vh', maxHeight: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {video.title || '视频预览'}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <iframe
            src={video.url}
            title={video.title || 'Video Preview'}
            sandbox="allow-scripts allow-same-origin allow-popups"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: 400,
            }}
            allowFullScreen
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
