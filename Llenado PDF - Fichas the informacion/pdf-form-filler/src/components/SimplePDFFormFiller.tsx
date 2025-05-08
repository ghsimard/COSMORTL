import React from 'react';
import { Button, Space } from 'antd';

const SimplePDFFormFiller: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Button>Upload Excel</Button>
          <Button>Upload PDF Template</Button>
          <Button type="primary">Generate PDFs</Button>
        </Space>
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
          <h2>Simple PDF Form Filler</h2>
          <p>This is a simplified version of the PDF Form Filler component.</p>
        </div>
      </Space>
    </div>
  );
};

export default SimplePDFFormFiller; 