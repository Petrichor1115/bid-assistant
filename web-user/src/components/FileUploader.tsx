import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

interface Props {
  accept?: string;
  multiple?: boolean;
  onChange: (file: File | File[] | null) => void;
}

export default function FileUploader({ accept = '.pdf', multiple = false, onChange }: Props) {
  return (
    <Upload.Dragger
      accept={accept}
      multiple={multiple}
      beforeUpload={() => false}
      onChange={(info) => {
        const files = info.fileList.map((f) => f.originFileObj as File).filter(Boolean);
        onChange(multiple ? files : files[0] || null);
      }}
      maxCount={multiple ? 20 : 1}
    >
      <p className="ant-upload-drag-icon">
        <UploadOutlined />
      </p>
      <p className="ant-upload-text">点击或拖拽文件上传</p>
      <p className="ant-upload-hint">仅支持 PDF，单文件 ≤ 50MB</p>
    </Upload.Dragger>
  );
}
