import React from 'react';

const TopControls = ({ 
  startPosition, 
  onStartPositionChange, 
  onSetup, 
  onUpload, 
  onDownload 
}) => {
  return (
    <div className="top-controls">
      <div>
        <label>Thiết lập gán nhãn từ vị trí thứ: </label>
        <input 
          type="number" 
          value={startPosition} 
          onChange={(e) => onStartPositionChange(e.target.value)}
          min="1" 
          style={{width: '50px'}}
        />
        <button onClick={onSetup}>Thiết lập</button>
      </div>
      <div>
        <button onClick={onUpload}>Upload tập dữ liệu gán nhãn - CSV</button>
        <button onClick={onDownload}>Tải xuống dữ liệu đã dán nhãn hiện tại</button>
      </div>
    </div>
  );
};

export default TopControls;
