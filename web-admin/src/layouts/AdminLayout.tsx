import { Layout, Menu, Space, Typography, message } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const items = [
    { key: '/admin', label: '系统仪表盘' },
    { key: '/admin/projects', label: '项目管理' },
    { key: '/admin/files', label: '文件管理' },
    { key: '/admin/audits', label: '审核管理' },
    { key: '/admin/permissions', label: '权限管理' },
    { key: '/admin/users', label: '用户管理' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={208} theme="light" style={{ borderRight: '1px solid #e5e6eb' }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid #f0f1f3' }}>
          <span className="brand-mark">投</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>投标智能助手</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>管理后台</div>
          </div>
        </div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={items} onClick={(e) => navigate(e.key)} style={{ padding: '12px 8px' }} />
        <Menu mode="inline" selectable={false} items={[
          { key: '/admin/conversations', label: '对话管理' },
          { key: '/admin/knowledge', label: '知识库管理' },
        ]} onClick={() => message.info('敬请期待')} style={{ padding: '0 8px' }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
          <Typography.Text strong>投标智能助手 · 管理端</Typography.Text>
          <Space>
            <span>{user?.name}</span>
            <a onClick={() => { logout(); navigate('/login'); }}>退出</a>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
