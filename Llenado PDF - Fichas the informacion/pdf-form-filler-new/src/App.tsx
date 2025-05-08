import React from 'react';
import { Layout, Typography } from 'antd';
import PDFFormFiller from './components/PDFFormFiller';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <Layout className="layout">
      <Header>
        <Title level={3}>PDF Form Filler</Title>
      </Header>
      <Content>
        <PDFFormFiller />
      </Content>
    </Layout>
  );
};

export default App;
