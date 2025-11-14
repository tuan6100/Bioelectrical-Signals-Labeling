import React from 'react';

const LeftPanel = ({ onBack }) => {
  return (
    <div className="left-panel">
      <div className="left-panel-box">
        <button className="back-btn" onClick={onBack}>Quay trở lại</button>

        {/*  */}
        <div className="emg-placeholder">
          {/*  */}
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
