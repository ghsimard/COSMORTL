import React from 'react';
import { Layout, Typography } from 'antd';
import PDFFormFiller from './components/PDFFormFiller';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout className="layout">
      <Header style={{ background: '#fff', padding: '0 20px' }}>
        <Title level={3}>PDF Form Filler</Title>
      </Header>
      <Content style={{ padding: '20px', minHeight: '100vh' }}>
        <PDFFormFiller />
      </Content>
    </Layout>
  );
}

export default App; 