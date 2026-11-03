import { Avatar, Button } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  FolderOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  EditOutlined,
  AuditOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GreyedItem from '../components/GreyedItem';

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-3)',
  padding: '14px 12px 4px',
  letterSpacing: 0.4,
};

const NAV_ITEM: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 6,
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1.4,
};

export default function ChatLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const onProjects = location.pathname.startsWith('/projects');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧导航（持久不变） */}
      <div style={{ width: 240, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', flex: 'none' }}>
        {/* 系统标题 */}
        <div onClick={() => navigate('/')} style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid var(--border-light)', flex: 'none', cursor: 'pointer' }}>
          <span className="brand-mark">投</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>投标智能助手</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>竞标对比系统</div>
          </div>
        </div>

        {/* 新建项目按钮 */}
        <div style={{ padding: 12, flex: 'none' }}>
          <Button type="primary" block icon={<PlusOutlined />} onClick={() => navigate('/projects/new')} style={{ height: 32, marginBottom: 8 }}>
            新建项目
          </Button>
          <Button block icon={<FolderOutlined />} onClick={() => navigate('/projects')} style={{ height: 32 }}>
            项目管理
          </Button>
        </div>

        {/* 导航内容 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px' }}>
          <div
            style={{ ...NAV_ITEM, background: onProjects ? 'var(--primary-bg)' : 'transparent', color: onProjects ? 'var(--primary)' : 'var(--text-2)', fontWeight: onProjects ? 500 : 400 }}
            onClick={() => navigate('/projects')}
          >
            <AppstoreOutlined />
            <span>竞标对比</span>
          </div>
          <GreyedItem icon={<FileSearchOutlined />} label="标讯追踪" />
          <GreyedItem icon={<FileTextOutlined />} label="招标解读" />
          <GreyedItem icon={<EditOutlined />} label="标书生成" />
          <GreyedItem icon={<AuditOutlined />} label="标书审查" />

          <div style={SECTION_LABEL}>对话</div>
          <GreyedItem icon={<PlusOutlined />} label="新建对话" />
          <GreyedItem icon={<HistoryOutlined />} label="对话记录" />
        </div>

        {/* 用户信息（底部） */}
        <div style={{ borderTop: '1px solid var(--border-light)', padding: 12, flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={26} icon={<UserOutlined />} style={{ background: 'var(--bg-sunken)', color: 'var(--text-2)' }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || '投标专员'}</span>
          <Button size="small" type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login'); }} />
        </div>
      </div>

      {/* 右侧内容区 */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-page)' }}>
        <Outlet />
      </div>
    </div>
  );
}
