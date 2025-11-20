import React from 'react';
import './TopControl.css';

export default function TopControl ({
}) {

  return (
    <div className="top-controls">
        <div className="right-panel-toolbar">
            <div className="toolbar-title">Label Tools</div>
            <div className="toolbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            </div>
        </div>

    </div>
  );
};
