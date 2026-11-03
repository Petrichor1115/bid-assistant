import type { ThemeConfig } from 'antd';

/**
 * 设计令牌（B 端企业版）：
 * 企业深蓝 + 中性灰底、6/8 圆角、以描边替代重阴影、32px 控件密度、14px 正文。
 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#2456d6',
    colorInfo: '#2456d6',
    colorLink: '#2456d6',
    colorSuccess: '#12a150',
    colorWarning: '#d97706',
    colorError: '#d92d20',

    colorTextBase: '#16233a',
    colorText: '#16233a',
    colorTextSecondary: '#46506b',
    colorTextTertiary: '#6b7488',
    colorTextQuaternary: '#9aa3b2',

    colorBorder: '#e3e8ef',
    colorBorderSecondary: '#eef1f5',
    colorFillTertiary: '#f2f4f7',
    colorBgLayout: '#f5f6f8',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    fontSize: 14,
    controlHeight: 32,

    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',

    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
    boxShadowSecondary: '0 8px 24px rgba(16, 24, 40, 0.10)',
  },
  components: {
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      bodyBg: '#f5f6f8',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#46506b',
      itemHoverBg: '#f2f4f7',
      itemSelectedBg: '#eef3fe',
      itemSelectedColor: '#2456d6',
      itemBorderRadius: 6,
      itemHeight: 36,
      activeBarBorderWidth: 0,
    },
    Card: {
      borderRadiusLG: 8,
      headerBg: '#fafbfc',
      headerFontSize: 14,
      boxShadowTertiary: 'none',
    },
    Table: {
      headerBg: '#f7f8fa',
      headerColor: '#6b7488',
      headerSplitColor: 'transparent',
      borderColor: '#eef1f5',
      rowHoverBg: '#f7f9fc',
      cellPaddingBlock: 10,
      headerBorderRadius: 0,
    },
    Button: {
      controlHeight: 32,
      borderRadius: 6,
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Tabs: {
      itemSelectedColor: '#2456d6',
      inkBarColor: '#2456d6',
      itemColor: '#46506b',
      horizontalItemPadding: '8px 0',
    },
    Input: { controlHeight: 32, borderRadius: 6 },
    Select: { controlHeight: 32, borderRadius: 6 },
    Tag: { borderRadiusSM: 4, defaultBg: '#f2f4f7', defaultColor: '#46506b' },
    Statistic: { contentFontSize: 26 },
    Steps: { colorPrimary: '#2456d6' },
  },
};
