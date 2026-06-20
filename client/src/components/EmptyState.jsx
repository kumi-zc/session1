import { Typography } from 'antd';

const { Text } = Typography;

const illustrations = {
  inventory: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="30" width="80" height="55" rx="4" fill="#f5f0eb" stroke="#D9B26A" strokeWidth="1.5"/>
      <rect x="30" y="20" width="60" height="15" rx="3" fill="#D9B26A" opacity="0.2"/>
      <rect x="35" y="45" width="50" height="6" rx="2" fill="#D9B26A" opacity="0.3"/>
      <rect x="35" y="56" width="35" height="6" rx="2" fill="#D9B26A" opacity="0.2"/>
      <rect x="35" y="67" width="45" height="6" rx="2" fill="#D9B26A" opacity="0.15"/>
      <circle cx="95" cy="25" r="12" fill="#D9B26A" opacity="0.15"/>
      <path d="M92 25h6M95 22v6" stroke="#D9B26A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  task: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="15" width="70" height="70" rx="6" fill="#f5f0eb" stroke="#D9B26A" strokeWidth="1.5"/>
      <rect x="35" y="30" width="50" height="8" rx="2" fill="#D9B26A" opacity="0.3"/>
      <rect x="35" y="45" width="35" height="6" rx="2" fill="#D9B26A" opacity="0.2"/>
      <rect x="35" y="58" width="45" height="6" rx="2" fill="#D9B26A" opacity="0.15"/>
      <circle cx="85" cy="25" r="10" fill="#D9B26A" opacity="0.2"/>
      <path d="M82 25l2 2 4-4" stroke="#D9B26A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="25" fill="#f5f0eb" stroke="#D9B26A" strokeWidth="1.5"/>
      <circle cx="50" cy="45" r="15" fill="none" stroke="#D9B26A" strokeWidth="1.5" opacity="0.5"/>
      <path d="M68 63l15 15" stroke="#D9B26A" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="50" cy="45" r="5" fill="#D9B26A" opacity="0.3"/>
    </svg>
  ),
  default: (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="20" width="70" height="60" rx="6" fill="#f5f0eb" stroke="#D9B26A" strokeWidth="1.5"/>
      <rect x="35" y="35" width="50" height="8" rx="2" fill="#D9B26A" opacity="0.3"/>
      <rect x="35" y="50" width="35" height="6" rx="2" fill="#D9B26A" opacity="0.2"/>
      <rect x="35" y="63" width="45" height="6" rx="2" fill="#D9B26A" opacity="0.15"/>
    </svg>
  ),
};

export default function EmptyState({ type = 'default', description = 'No data' }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        {illustrations[type] || illustrations.default}
      </div>
      <Text style={{ color: '#8c8c8c', fontSize: 14 }}>{description}</Text>
    </div>
  );
}
