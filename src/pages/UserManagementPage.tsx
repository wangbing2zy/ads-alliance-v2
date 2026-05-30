import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthStore } from '../stores/authStore';
import * as userApi from '../api/userApi';
import type { User, UserFormData } from '../types';

/**
 * UserManagementPage - Admin-only page for managing users.
 */
export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.fetchUsers();
      setUsers(data);
    } catch (err) {
      showSnackbar((err as Error).message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenCreate = () => {
    setEditUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('user');
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setFormUsername(user.username);
    setFormPassword('');
    setFormRole(user.role as 'admin' | 'user');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editUser) {
        await userApi.updateUser(editUser.id, {
          role: formRole,
          password: formPassword || undefined,
        });
        showSnackbar('用户更新成功', 'success');
      } else {
        if (!formUsername || !formPassword) {
          showSnackbar('用户名和密码不能为空', 'error');
          return;
        }
        await userApi.createUser({ username: formUsername, password: formPassword, role: formRole });
        showSnackbar('用户创建成功', 'success');
      }
      setDialogOpen(false);
      loadUsers();
    } catch (err) {
      showSnackbar((err as Error).message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === 1) {
      showSnackbar('不能删除默认管理员', 'error');
      return;
    }
    if (!window.confirm('确定要删除该用户吗？')) return;
    try {
      await userApi.deleteUser(id);
      showSnackbar('用户已删除', 'success');
      loadUsers();
    } catch (err) {
      showSnackbar((err as Error).message, 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          用户管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={loadUsers} disabled={loading}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            添加用户
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>用户名</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.id}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {user.username}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'admin' ? '管理员' : '普通用户'}
                    size="small"
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  {user.id !== 1 && (
                    <>
                      <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? '编辑用户' : '添加用户'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="用户名"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            margin="normal"
            size="small"
            disabled={!!editUser}
            required
          />
          <TextField
            fullWidth
            label={editUser ? '新密码（留空不修改）' : '密码'}
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            margin="normal"
            size="small"
            required={!editUser}
          />
          <TextField
            fullWidth
            select
            label="角色"
            value={formRole}
            onChange={(e) => setFormRole(e.target.value as 'admin' | 'user')}
            margin="normal"
            size="small"
          >
            <MenuItem value="user">普通用户</MenuItem>
            <MenuItem value="admin">管理员</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>
            {editUser ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
