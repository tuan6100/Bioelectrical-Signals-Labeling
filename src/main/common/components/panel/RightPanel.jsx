import React from 'react';
import TopControl from './control/TopControl.jsx';
import LabelTable from '../table/LabelTable.jsx';
import BottomControl from './control/BottomControl.jsx';
import './RightPanel.css'

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
      <TopControl
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

      <BottomControl
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
