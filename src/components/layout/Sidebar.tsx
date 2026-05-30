import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LanguageIcon from '@mui/icons-material/Language';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import ArticleIcon from '@mui/icons-material/Article';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  width: number;
  userRole?: string;
}

/**
 * Sidebar - Navigation sidebar with collapsible drawer.
 * Shows video management and user management (admin only) menu items.
 */
export default function Sidebar({ open, onToggle, currentPath, onNavigate, width, userRole = 'guest' }: SidebarProps) {
  const { user } = useAuthStore();

  // Build menu items based on user role
  const menuItems = [
    { text: '仪表盘', path: '/', icon: <DashboardIcon /> },
    { text: '代理管理', path: '/proxies', icon: <LanguageIcon /> },
    { text: '视频管理', path: '/videos', icon: <VideoLibraryIcon /> },
    { text: '任务管理', path: '/tasks', icon: <AssignmentIcon /> },
    { text: '收益统计', path: '/earnings', icon: <PaidIcon /> },
    ...(userRole === 'admin' ? [{ text: '用户管理', path: '/users', icon: <PeopleIcon /> }] : []),
    { text: '系统日志', path: '/logs', icon: <ArticleIcon /> },
    { text: '系统设置', path: '/settings', icon: <SettingsIcon /> },
  ];

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? width : 64,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? width : 64,
          boxSizing: 'border-box',
          transition: 'width 0.2s',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          p: 1,
          height: 64,
        }}
      >
        {open && (
          <IconButton onClick={onToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      <List sx={{ pt: 1, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = currentPath === item.path ||
            (item.path !== '/' && currentPath.startsWith(item.path));

          const button = (
            <ListItemButton
              selected={isActive}
              onClick={() => onNavigate(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: open ? 40 : 'unset',
                  justifyContent: 'center',
                  color: isActive ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />}
            </ListItemButton>
          );

          return (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              {open ? (
                button
              ) : (
                <Tooltip title={item.text} placement="right">
                  {button}
                </Tooltip>
              )}
            </ListItem>
          );
        })}
      </List>

      {/* User info at bottom */}
      {open && user && user.role !== 'guest' && (
        <>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role === 'admin' ? '管理员' : '用户'}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
}
