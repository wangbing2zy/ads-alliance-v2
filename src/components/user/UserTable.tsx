import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { User } from '../../types';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

/**
 * Format ISO date string to readable format
 */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'));
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const ROLE_CONFIG: Record<string, { label: string; color: 'warning' | 'info' | 'default' }> = {
  admin: { label: '管理员', color: 'warning' },
  user: { label: '用户', color: 'info' },
  guest: { label: '访客', color: 'default' },
};

/**
 * UserTable - Displays user list with edit and delete actions.
 */
export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>用户名</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>角色</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 180 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 100 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    暂无用户
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.guest;
                const isDefaultAdmin = user.id === 1;

                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={isDefaultAdmin ? 600 : 400}>
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleConfig.label}
                        size="small"
                        color={roleConfig.color}
                        variant="outlined"
                        sx={{ fontSize: 12 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(user.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isDefaultAdmin ? (
                        <Typography variant="caption" color="text.secondary">
                          默认管理员
                        </Typography>
                      ) : (
                        <Tooltip title="">
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <IconButton size="small" onClick={() => onEdit(user)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => onDelete(user)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
