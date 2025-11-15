import React from 'react';
import TopControls from './TopControls';
import LabelTable from './LabelTable';
import BottomControls from './BottomControls';

const RightPanel = ({ 
  startPosition, 
  onStartPositionChange,
  onSetup,
  onUpload,
  onDownload,
  tableData,
  onDeleteRow,
  onAddLabel,
  onSave,
  isLabeled,
  isDoubleChecked,
  onToggleLabeled,
  onToggleDoubleChecked,
  onLabelChange
}) => {
  return (
    <div className="right-panel">
      <TopControls
        startPosition={startPosition}
        onStartPositionChange={onStartPositionChange}
        onSetup={onSetup}
        onUpload={onUpload}
        onDownload={onDownload}
      />
      
      <LabelTable
        data={tableData}
        onDeleteRow={onDeleteRow}
        onLabelChange={onLabelChange}
      />
      
      <BottomControls
        onAddLabel={onAddLabel}
        onSave={onSave}
        isLabeled={isLabeled}
        isDoubleChecked={isDoubleChecked}
        onToggleLabeled={onToggleLabeled}
        onToggleDoubleChecked={onToggleDoubleChecked}
      />
    </div>
  );
};

export default RightPanel;
