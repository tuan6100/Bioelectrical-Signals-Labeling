import React from 'react';
import './BottomControl.css'

const BottomControl = ({
  isLabeled,
  isDoubleChecked,
  onToggleLabeled,
  onToggleDoubleChecked
}) => {
  return (
    <div className="bottom-controls">
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

export default BottomControl;
