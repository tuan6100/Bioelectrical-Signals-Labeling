import React from 'react';
import './LabelContextMenu.css';

export default function LabelContextMenu({
  x,
  y,
  type,
  allLabelOptions = [],
  isEditingPersisted = false,
  onEditPersistedClick,
  onDeletePersistedClick,
  onBackPersistedClick,
  onChoosePersistedLabel,
}) {
  return (
    <div
      id="label-context-menu"
      className="signal-label-menu"
      style={{ top: y, left: x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {type === 'persisted' && !isEditingPersisted && (
        <div>
          <div className="signal-label-menu__title">Label Actions:</div>
          <button
            className="signal-label-menu__btn signal-label-menu__btn--primary"
            onClick={onEditPersistedClick}
          >Edit Label</button>
          <button
            className="signal-label-menu__btn signal-label-menu__btn--danger"
            onClick={onDeletePersistedClick}
          >Delete Label</button>
        </div>
      )}

      {type === 'persisted' && isEditingPersisted && (
        <div>
          <div className="signal-label-menu__title">Change Label To:</div>
          <div className="signal-label-menu__list">
            {allLabelOptions.map((opt) => (
              <div
                key={opt.value}
                className="signal-label-menu__option"
                onClick={() => onChoosePersistedLabel && onChoosePersistedLabel(opt)}
              >
                {opt.label}
              </div>
            ))}
          </div>
          <button
            className="signal-label-menu__btn"
            onClick={onBackPersistedClick}
          >Back</button>
        </div>
      )}
    </div>
  );
}

