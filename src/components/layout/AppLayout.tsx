import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import Sidebar from './Sidebar';
import GuestBanner from '../auth/GuestBanner';
import { useAuthStore } from '../../stores/authStore';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

/**
 * AppLayout - Main application layout with sidebar navigation and content area.
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({ open: false, message: '', severity: 'info' });
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isGuest, logout } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawerWidth = drawerOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        open={drawerOpen}
        onToggle={handleDrawerToggle}
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
        width={DRAWER_WIDTH}
        userRole={user?.role || 'guest'}
      />

      <Box
        sx={{
          flexGrow: 1,
          ml: `${drawerWidth}px`,
          transition: 'margin-left 0.2s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="toggle drawer"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" fontWeight={600}>
              广告联盟系统 V2
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            {/* User info / Guest banner */}
            {isGuest ? (
              <GuestBanner />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<PersonIcon />}
                  label={user?.username || '用户'}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
                <Button
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  color="inherit"
                  sx={{ fontSize: 13 }}
                >
                  退出
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5' }}>
          <Outlet />
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
