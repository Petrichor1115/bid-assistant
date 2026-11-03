import { Button, Input, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import TenderCard from '../components/TenderCard';

const TENDERS = [
  { icon: '/src/assets/tenders/residential.svg', name: '德国北威州户用储能系统采购招标' },
  { icon: '/src/assets/tenders/commercial.svg', name: '巴伐利亚 50MWh 工商业储能 EPC 招标' },
  { icon: '/src/assets/tenders/utility.svg', name: '西班牙 200MW/400MWh 大型储能电站招标' },
  { icon: '/src/assets/tenders/ems.svg', name: '欧洲多站点 EMS 能源管理平台招标' },
  { icon: '/src/assets/tenders/battery.svg', name: '波兰 1GWh LFP 电池包框架采购招标' },
];

export default function ChatHome() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24, minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 auto' }}>
        {/* 主模块（标题 + 对话框 + 快捷键），在剩余高度内垂直居中 */}
        <div style={{ flex: '1 1 auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'safe center' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>投标智能助手</Typography.Title>
          <Typography.Text type="secondary" style={{ marginBottom: 36, textAlign: 'center' }}>上传招标公告、我方与对手标书，AI 自动拆解技术参数并竞标对比</Typography.Text>

          {/* 居中输入框（DeepSeek 风格） */}
          <div style={{ width: '100%', maxWidth: 720, position: 'relative' }}>
            <Input.TextArea
              autoSize={{ minRows: 5, maxRows: 10 }}
              placeholder="给投标助手发送消息…"
              onClick={() => message.info('敬请期待')}
              style={{ borderRadius: 10, fontSize: 14, padding: '16px 52px 56px 104px', resize: 'none' }}
            />
            {/* 上传附件（左上角，中间加号） */}
            <div
              onClick={() => message.info('敬请期待')}
              style={{
                position: 'absolute',
                left: 14,
                top: 14,
                height: '50%',
                aspectRatio: '3 / 4',
                borderRadius: 6,
                border: '1px dashed var(--primary)',
                background: 'var(--primary-bg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
              title="上传附件（敬请期待）"
            >
              <svg viewBox="0 0 24 24" width="48%" height="48%" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<SendOutlined />}
              onClick={() => message.info('敬请期待')}
              style={{ position: 'absolute', right: 12, bottom: 12 }}
            />
          </div>

          {/* 快捷键（对话框下方） */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, maxWidth: 720 }}>
            <Button onClick={() => navigate('/projects')}>项目管理</Button>
            <Button onClick={() => navigate('/projects/new')}>新建项目</Button>
            <Button onClick={() => navigate('/projects')}>竞标对比</Button>
            <Button onClick={() => message.info('敬请期待')}>标讯追踪</Button>
            <Button onClick={() => message.info('敬请期待')}>招标解读</Button>
            <Button onClick={() => message.info('敬请期待')}>标书生成</Button>
            <Button onClick={() => message.info('敬请期待')}>标书审查</Button>
          </div>
        </div>

        {/* 最新标讯（与对话框同宽、居中对齐） */}
        <div style={{ width: '100%', maxWidth: 720, paddingTop: 48 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, textAlign: 'left' }}>最新标讯</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {TENDERS.map((t) => <TenderCard key={t.name} icon={t.icon} name={t.name} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
