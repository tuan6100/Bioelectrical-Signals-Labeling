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
  const [emgJson, setEmgJson] = useState(null);

  const handleBack = () => {
    console.log('Quay trở lại');
  };

  const handleSetup = () => {
    console.log('Setup từ vị trí:', startPosition);
  };

  const handleUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target.result.replace(/\r\n|\r|\n/g, '\n');
        const averaged = extractAveragedData(content);
        const firstName = extractFirstName(content);
        const parsed = {
          'Averaged Data': averaged,
          'First Name': firstName || ''
        };
        setEmgJson(parsed);
      } catch (err) {
        console.error('Failed to parse EMG file', err);
      }
    };
    reader.readAsText(file, 'utf-16le');
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

  function extractAveragedData(text) {
    if (!text) return null;
    const headerRegex = /^\[[^\]]*Averaged Data[^\]]*\]/gmi;
    const match = headerRegex.exec(text);
    if (!match) return null;
    const startIndex = match.index + match[0].length;
    const nextHeaderRegex = /^\[/gm;
    nextHeaderRegex.lastIndex = startIndex;
    const nextMatch = nextHeaderRegex.exec(text);
    const endIndex = nextMatch ? nextMatch.index : text.length;
    const block = text.substring(startIndex, endIndex).trim();
    return block;
  }

  function extractFirstName(text) {
    if (!text) return null;
    const m = text.match(/^\s*First Name\s*[=:]?\s*(.+)$/im);
    if (m) return m[1].trim();
    return null;
  }

  return (
    <div className="container">
      <LeftPanel onBack={handleBack} emgJson={emgJson} />
      
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
