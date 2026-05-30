import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * LoginForm - Login form component with username/password fields.
 */
export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || '登录失败');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        fullWidth
        label="用户名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        margin="normal"
        required
        size="small"
      />
      <TextField
        fullWidth
        label="密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        margin="normal"
        required
        size="small"
      />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 2, py: 1 }}
        disabled={loading || !username || !password}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
      </Button>
    </Box>
  );
}
