import React from 'react';
import './TopControl.css';

export default function TopControl({sessionId}) {
  return (
    <div className="top-controls">
        <div className="right-panel-toolbar">
            <div className="toolbar-title">{`Session #${sessionId}`}</div>
            <div className="toolbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            </div>
        </div>

    </div>
  );
};
