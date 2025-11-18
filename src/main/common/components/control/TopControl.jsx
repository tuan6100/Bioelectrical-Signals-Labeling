import React from 'react';

export default function TopControl ({
  layoutMode,
  onChangeLayout,
  loading
}) {
  const splitDisabled = !!loading || (typeof window !== 'undefined' && window.innerWidth < 1100);

  return (
    <div className="top-controls">
        <div className="right-panel-toolbar">
            <div className="toolbar-title">Label Tools</div>
            <div className="toolbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div className="layout-toggle">
                    <button
                        className={`toggle-btn ${layoutMode === 'left' ? 'active' : ''}`}
                        onClick={() => onChangeLayout && onChangeLayout('left')}
                        disabled={!!loading}
                    >
                        Left
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'split' ? 'active' : ''}`}
                        onClick={() => onChangeLayout && onChangeLayout('split')}
                        disabled={splitDisabled}
                    >
                        Split
                    </button>
                    <button
                        className={`toggle-btn ${layoutMode === 'right' ? 'active' : ''}`}
                        onClick={() => onChangeLayout && onChangeLayout('right')}
                        disabled={!!loading}
                    >
                        Right
                    </button>
                </div>
            </div>
        </div>

    </div>
  );
};
