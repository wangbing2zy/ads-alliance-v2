import React from 'react';
import { Chip, Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

/**
 * GuestBanner - Banner shown when user is in guest mode.
 */
export default function GuestBanner() {
  const isGuest = useAuthStore((s) => s.isGuest);
  const navigate = useNavigate();

  if (!isGuest) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={<PersonIcon />}
        label="访客模式"
        size="small"
        color="warning"
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
      <Box
        component="a"
        onClick={() => navigate('/login')}
        sx={{
          fontSize: 13,
          color: 'primary.main',
          cursor: 'pointer',
          textDecoration: 'underline',
          '&:hover': { color: 'primary.dark' },
        }}
      >
        登录
      </Box>
    </Box>
  );
}
