import { Modal, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function confirmDelete(itemName, onConfirm) {
  Modal.confirm({
    title: 'Confirm Delete',
    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    content: (
      <div>
        <Text>Are you sure you want to delete</Text>
        <Text strong style={{ color: '#ff4d4f', marginLeft: 4 }}>{itemName}</Text>
        <Text>?</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>This action cannot be undone.</Text>
      </div>
    ),
    okText: 'Delete',
    cancelText: 'Cancel',
    okType: 'danger',
    onOk: onConfirm,
  });
}

export function confirmAction(title, content, onConfirm) {
  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined style={{ color: '#D9B26A' }} />,
    content,
    okText: 'Confirm',
    cancelText: 'Cancel',
    onOk: onConfirm,
  });
}
