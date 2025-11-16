import React from 'react';

const BottomControls = ({ 
  onAddLabel, 
  onSave, 
  isLabeled, 
  isDoubleChecked, 
  onToggleLabeled, 
  onToggleDoubleChecked 
}) => {
  return (
    <div className="bottom-controls">
      <div>
        <button onClick={onAddLabel}>Gán thêm nhãn mới</button>
        <button onClick={onSave}>Lưu kết quả</button>
      </div>
      <div className="toggle">
        <label>Đánh dấu đã gán nhãn xong</label>
        <input 
          type="checkbox" 
          checked={isLabeled}
          onChange={(e) => onToggleLabeled(e.target.checked)}
        />
        <label>Đánh dấu đã doublecheck</label>
        <input 
          type="checkbox"
          checked={isDoubleChecked}
          onChange={(e) => onToggleDoubleChecked(e.target.checked)}
        />
      </div>
    </div>
  );
};

export default BottomControls;
