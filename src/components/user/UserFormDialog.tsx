import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { User, UserFormData } from '../../types';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  editUser?: User | null;
}

/**
 * UserFormDialog - Dialog for adding or editing a user.
 * Add mode: username + password (required) + role select
 * Edit mode: username (read-only) + password (optional) + role select
 */
export default function UserFormDialog({ open, onClose, onSave, editUser }: UserFormDialogProps) {
  const [username, setUsername] = useState(editUser?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(editUser?.role === 'admin' ? 'admin' : 'user');
  const [saving, setSaving] = useState(false);

  const isEditMode = !!editUser;

  const handleSave = async () => {
    if (!username.trim()) return;
    if (!isEditMode && !password.trim()) return;

    setSaving(true);
    try {
      const data: UserFormData = {
        username: username.trim(),
        role,
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      await onSave(data);
      handleClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setRole('user');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEditMode ? '编辑用户' : '添加用户'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            disabled={isEditMode}
            size="small"
          />

          <TextField
            label={isEditMode ? '新密码（留空不修改）' : '密码'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required={!isEditMode}
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>角色</InputLabel>
            <Select
              value={role}
              label="角色"
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            >
              <MenuItem value="user">用户</MenuItem>
              <MenuItem value="admin">管理员</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!username.trim() || (!isEditMode && !password.trim()) || saving}
        >
          {saving ? '保存中...' : isEditMode ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
