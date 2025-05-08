import React, { useState } from 'react';
import { Upload, Button, Table, message, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { read, utils } from 'xlsx';
import { PDFDocument } from 'pdf-lib';

interface ExcelData {
  [key: string]: string;
}

const PDFFormFiller: React.FC = () => {
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [pdfTemplate, setPdfTemplate] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExcelUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json<ExcelData>(worksheet);
      setExcelData(data);
      message.success('Excel file loaded successfully');
    } catch (error) {
      message.error('Error reading Excel file');
      console.error(error);
    }
    return false;
  };

  const handlePDFUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setPdfTemplate(buffer);
      message.success('PDF template loaded successfully');
    } catch (error) {
      message.error('Error reading PDF template');
      console.error(error);
    }
    return false;
  };

  const generatePDFs = async () => {
    if (!pdfTemplate || excelData.length === 0) {
      message.error('Please upload both Excel file and PDF template');
      return;
    }

    setLoading(true);
    try {
      for (const row of excelData) {
        const pdfDoc = await PDFDocument.load(pdfTemplate);
        const form = pdfDoc.getForm();
        
        // Fill form fields based on Excel data
        Object.entries(row).forEach(([key, value]) => {
          try {
            const field = form.getTextField(key);
            if (field) {
              field.setText(String(value));
            }
          } catch (error) {
            console.warn(`Field ${key} not found in PDF`);
          }
        });

        // Save the filled PDF
        const filledPdfBytes = await pdfDoc.save();
        const blob = new Blob([filledPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Download the PDF
        const link = document.createElement('a');
        link.href = url;
        link.download = `filled_form_${Object.values(row)[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
      message.success('PDFs generated successfully');
    } catch (error) {
      message.error('Error generating PDFs');
      console.error(error);
    }
    setLoading(false);
  };

  const columns = excelData.length > 0
    ? Object.keys(excelData[0]).map(key => ({
        title: key,
        dataIndex: key,
        key: key,
      }))
    : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={handleExcelUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Upload Excel</Button>
          </Upload>

          <Upload
            accept=".pdf"
            beforeUpload={handlePDFUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Upload PDF Template</Button>
          </Upload>

          <Button
            type="primary"
            onClick={generatePDFs}
            loading={loading}
            disabled={!pdfTemplate || excelData.length === 0}
          >
            Generate PDFs
          </Button>
        </Space>

        {excelData.length > 0 && (
          <Table
            dataSource={excelData}
            columns={columns}
            scroll={{ x: true }}
            size="small"
          />
        )}
      </Space>
    </div>
  );
};

export default PDFFormFiller; 