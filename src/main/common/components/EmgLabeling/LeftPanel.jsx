import React from 'react';
import { DrawChart } from '../EmgChart';

const LeftPanel = ({ onBack, emgJson }) => {
  return (
    <div className="left-panel">
      <div className="left-panel-box">
        <button className="back-btn" onClick={onBack}>Quay trở lại</button>

        <div className="emg-placeholder">
          {emgJson ? (
            <DrawChart jsonData={emgJson} />
          ) : (
            <p style={{ color: '#999' }}>Chưa chọn file EMG</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
