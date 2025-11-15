import React, { useState } from 'react';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import './styles.css';

const EmgLabelingApp = () => {
  const [startPosition, setStartPosition] = useState(1);
  const [tableData, setTableData] = useState([
    {
      id: 1,
      startSecond: 'Từ giây 116.8',
      endSecond: 'Đến giây 118.6',
      label1: '',
      label2: '',
      label3: '',
      label4: '',
      label5: ''
    }
  ]);
  const [isLabeled, setIsLabeled] = useState(false);
  const [isDoubleChecked, setIsDoubleChecked] = useState(false);

  const handleBack = () => {
    console.log('Quay trở lại');
  };

  const handleSetup = () => {
    console.log('Setup từ vị trí:', startPosition);
  };

  const handleUpload = () => {
    console.log('Upload CSV');
  };

  const handleDownload = () => {
    console.log('Download data');
  };

  const handleDeleteRow = (id) => {
    setTableData(tableData.filter(row => row.id !== id));
  };

  const handleAddLabel = () => {
    const newLabel = {
      id: Date.now(),
      startSecond: '',
      endSecond: '',
      label1: '',
      label2: '',
      label3: '',
      label4: '',
      label5: ''
    };
    setTableData([...tableData, newLabel]);
  };

  const handleSave = () => {
    console.log('Lưu kết quả:', tableData);
  };

  const handleLabelChange = (rowId, labelField, value) => {
    setTableData(tableData.map(row => 
      row.id === rowId ? { ...row, [labelField]: value } : row
    ));
  };

  return (
    <div className="container">
      <LeftPanel onBack={handleBack} />
      
      <RightPanel
        startPosition={startPosition}
        onStartPositionChange={setStartPosition}
        onSetup={handleSetup}
        onUpload={handleUpload}
        onDownload={handleDownload}
        tableData={tableData}
        onDeleteRow={handleDeleteRow}
        onAddLabel={handleAddLabel}
        onSave={handleSave}
        isLabeled={isLabeled}
        isDoubleChecked={isDoubleChecked}
        onToggleLabeled={setIsLabeled}
        onToggleDoubleChecked={setIsDoubleChecked}
        onLabelChange={handleLabelChange}
      />
    </div>
  );
};

export default EmgLabelingApp;
