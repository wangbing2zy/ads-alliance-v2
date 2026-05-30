import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import ProxyPage from './pages/ProxyPage';
import TaskPage from './pages/TaskPage';
import TaskEditorPage from './pages/TaskEditorPage';
import EarningsPage from './pages/EarningsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import VideoPage from './pages/VideoPage';
import UserManagementPage from './pages/UserManagementPage';
import LogPage from './pages/LogPage';
import { useAuthStore } from './stores/authStore';

function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Login page - standalone layout, no AppLayout wrapper */}
        <Route path="/login" element={<LoginPage />} />

        {/* All other pages wrapped in AppLayout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="proxies" element={<ProxyPage />} />
          <Route path="videos" element={<VideoPage />} />
          <Route path="tasks" element={<TaskPage />} />
          <Route path="tasks/new" element={<TaskEditorPage />} />
          <Route path="tasks/:id/edit" element={<TaskEditorPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="logs" element={<LogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
