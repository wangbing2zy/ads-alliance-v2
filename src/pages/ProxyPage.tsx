import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LinkIcon from '@mui/icons-material/Link';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ProxyTable from '../components/proxy/ProxyTable';
import ProxyFormDialog from '../components/proxy/ProxyFormDialog';
import ProxyImportDialog from '../components/proxy/ProxyImportDialog';
import { useProxyStore } from '../stores/proxyStore';
import type { Proxy, ProxyFormData } from '../types';

/**
 * ProxyPage - Proxy management page with table, filters, and CRUD dialogs.
 */
export default function ProxyPage() {
  const {
    proxies, total, page, pageSize, filters, loading,
    loadProxies, createProxy, updateProxy, deleteProxy,
    batchImport, batchDelete, healthCheck, fetchFromKDL, fetchFromExternalApi, deleteByStatus, setFilters,
    verifyIp, batchVerifyIp,
  } = useProxyStore();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [apiFetchDialogOpen, setApiFetchDialogOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://49.51.70.25:8080/api/proxies');
  const [apiFetching, setApiFetching] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [verifyingIds, setVerifyingIds] = useState<number[]>([]);

  useEffect(() => {
    loadProxies();
  }, [loadProxies]);

  const handleCreate = async (data: ProxyFormData) => {
    await createProxy(data);
    setFormDialogOpen(false);
  };

  const handleUpdate = async (data: ProxyFormData) => {
    if (editingProxy) {
      await updateProxy(editingProxy.id, data);
      setEditingProxy(null);
      setFormDialogOpen(false);
    }
  };

  const handleEdit = (proxy: Proxy) => {
    setEditingProxy(proxy);
    setFormDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除该代理？')) {
      await deleteProxy(id);
    }
  };

  const handleBatchDelete = async (ids: number[]) => {
    if (confirm(`确定删除选中的 ${ids.length} 个代理？`)) {
      await batchDelete(ids);
      setSelectedIds([]);
    }
  };

  const handleImport = async (proxies: ProxyFormData[]): Promise<{ inserted: number; duplicates: number }> => {
    const result = await batchImport(proxies);
    setImportDialogOpen(false);
    return result || { inserted: 0, duplicates: 0 };
  };

  const handleKDLFetch = async () => {
    if (confirm('确定从快代理拉取代理列表？')) {
      try {
        const result = await fetchFromKDL();
        alert(`拉取完成：获取 ${result.fetched} 个，新增 ${result.inserted} 个，重复 ${result.duplicates} 个`);
      } catch (err) {
        alert(`拉取失败：${(err as Error).message}`);
      }
    }
  };

  const handleApiFetchSubmit = async () => {
    if (!apiUrl.trim()) {
      alert('请输入API地址');
      return;
    }
    setApiFetching(true);
    try {
      const result = await fetchFromExternalApi(apiUrl.trim());
      setApiFetchDialogOpen(false);
      alert(`从API拉取完成：获取 ${result.fetched} 个，新增 ${result.inserted} 个，重复 ${result.duplicates} 个。正在自动验证...`);

      // 自动验证新导入的代理
      if (result.inserted > 0) {
        const healthResults = await healthCheck([]);
        const avail = healthResults.filter(r => r.status === 'available').length;
        const slow = healthResults.filter(r => r.status === 'slow').length;
        const unavail = healthResults.filter(r => r.status === 'unavailable').length;
        alert(`验证完成\n\n可用: ${avail}\n较慢: ${slow}\n不可用: ${unavail}\n总计: ${healthResults.length}`);
      }
    } catch (err) {
      alert(`拉取失败：${(err as Error).message}`);
    } finally {
      setApiFetching(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      // 始终检测所有代理，忽略当前选中的代理
      const results = await healthCheck([]);
      const available = results.filter(r => r.status === 'available').length;
      const slow = results.filter(r => r.status === 'slow').length;
      const unavailable = results.filter(r => r.status === 'unavailable').length;
      alert(`健康检测完成\n\n可用: ${available}\n较慢: ${slow}\n不可用: ${unavailable}\n总计: ${results.length}`);
    } catch (err) {
      alert(`检测失败：${(err as Error).message}`);
    }
  };

  const handleDeleteUnavailable = async () => {
    const count = proxies.filter(p => p.status === 'unavailable').length;
    if (count === 0) {
      alert('没有不可用的代理需要删除');
      return;
    }
    if (confirm(`确定删除所有 ${count} 个不可用代理？此操作不可撤销！`)) {
      try {
        const deleted = await deleteByStatus('unavailable');
        alert(`已删除 ${deleted} 个不可用代理`);
      } catch (err) {
        alert(`删除失败：${(err as Error).message}`);
      }
    }
  };

  const handleVerifyIp = async (id: number) => {
    setVerifyingIds((prev) => [...prev, id]);
    try {
      await verifyIp(id);
    } finally {
      setVerifyingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBatchVerifyIp = async () => {
    if (selectedIds.length === 0) {
      alert('请先选择要验证的代理');
      return;
    }
    setVerifyingIds([...selectedIds]);
    try {
      await batchVerifyIp(selectedIds);
    } finally {
      setVerifyingIds([]);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          代理管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingProxy(null); setFormDialogOpen(true); }}
          >
            添加
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            批量导入
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleKDLFetch}
          >
            拉取KDL
          </Button>
          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => setApiFetchDialogOpen(true)}
          >
            从API拉取
          </Button>
          <Button
            variant="outlined"
            startIcon={<HealthAndSafetyIcon />}
            onClick={handleHealthCheck}
          >
            健康检测
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleDeleteUnavailable}
          >
            删除不可用
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>协议</InputLabel>
          <Select
            value={filters.protocol || ''}
            label="协议"
            onChange={(e) => setFilters({ protocol: e.target.value || undefined })}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="http">HTTP</MenuItem>
            <MenuItem value="https">HTTPS</MenuItem>
            <MenuItem value="socks5">SOCKS5</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={filters.status || ''}
            label="状态"
            onChange={(e) => setFilters({ status: e.target.value || undefined })}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="unchecked">未检测</MenuItem>
            <MenuItem value="available">可用</MenuItem>
            <MenuItem value="slow">较慢</MenuItem>
            <MenuItem value="unavailable">不可用</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="地区"
          value={filters.region || ''}
          onChange={(e) => setFilters({ region: e.target.value || undefined })}
          size="small"
          sx={{ width: 150 }}
          placeholder="如 US, UK"
        />
      </Box>

      <ProxyTable
        proxies={proxies}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setFilters({ page: p })}
        onPageSizeChange={(s) => setFilters({ pageSize: s, page: 1 })}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBatchDelete={handleBatchDelete}
        onVerifyIp={handleVerifyIp}
        onBatchVerifyIp={handleBatchVerifyIp}
        verifyingIds={verifyingIds}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <ProxyFormDialog
        open={formDialogOpen}
        proxy={editingProxy}
        onClose={() => { setFormDialogOpen(false); setEditingProxy(null); }}
        onSubmit={editingProxy ? handleUpdate : handleCreate}
      />

      <ProxyImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSubmit={handleImport}
      />

      {/* API拉取对话框 */}
      <Dialog open={apiFetchDialogOpen} onClose={() => !apiFetching && setApiFetchDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>从API拉取代理</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            输入外部API地址，系统将从该接口获取代理列表并自动导入。
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            预期返回格式：{'{'} proxies: [{'{"ip":"x.x.x.x","port":8080,"protocol":"http","response_ms":100}'}]
          </Alert>
          <TextField
            fullWidth
            label="API地址"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            size="small"
            placeholder="http://example.com/api/proxies"
            disabled={apiFetching}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiFetchDialogOpen(false)} disabled={apiFetching}>取消</Button>
          <Button
            variant="contained"
            onClick={handleApiFetchSubmit}
            disabled={!apiUrl.trim() || apiFetching}
            startIcon={apiFetching ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {apiFetching ? '拉取中...' : '拉取并导入'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
