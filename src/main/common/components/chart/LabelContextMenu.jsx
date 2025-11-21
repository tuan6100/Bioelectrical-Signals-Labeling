import React from 'react';
import './LabelContextMenu.css';

export default function LabelContextMenu({
  x,
  y,
  type,
  allLabelOptions = [],
  isCreatingNewLabel = false,
  isEditingPersisted = false,
  isCreatingNewLabelPersisted = false,
  onSelectLabel,
  onAddNewLabelClick,
  onCancelPendingClick,
  onCreateNewLabelInputSubmit,
  onEditPersistedClick,
  onDeletePersistedClick,
  onBackPersistedClick,
  onChoosePersistedLabel,
  onCreateNewPersistedLabelClick,
  onCreateNewPersistedLabelSubmit,
}) {
  return (
    <div
      id="label-context-menu"
      className="signal-label-menu"
      style={{ top: y, left: x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {type === 'pending' && !isCreatingNewLabel && (
        <div>
          <div className="signal-label-menu__title">Select Label:</div>
          <div className="signal-label-menu__list">
            {allLabelOptions.map((opt) => (
              <div
                key={opt.value}
                className="signal-label-menu__option"
                onClick={() => onSelectLabel && onSelectLabel(opt)}
              >
                {opt.label}
              </div>
            ))}
          </div>
          <button
            className="signal-label-menu__btn signal-label-menu__btn--add"
            onClick={onAddNewLabelClick}
          >
            <span className="signal-label-menu__btn-icon">+</span>
            <span>Add New Label</span>
          </button>
          <button
            className="signal-label-menu__btn signal-label-menu__btn--danger"
            onClick={onCancelPendingClick}
          >
            <span className="signal-label-menu__btn-icon">×</span>
            <span>Cancel Pending</span>
          </button>
        </div>
      )}

      {type === 'pending' && isCreatingNewLabel && (
        <div>
          <div className="signal-label-menu__title">New Label Name:</div>
          <input
            type="text"
            autoFocus
            placeholder="Enter label name..."
            className="signal-label-menu__input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = e.currentTarget.value.trim();
                if (value && onCreateNewLabelInputSubmit) onCreateNewLabelInputSubmit(value);
              } else if (e.key === 'Escape') {
                onAddNewLabelClick && onAddNewLabelClick(false);
              }
            }}
          />
          <div className="signal-label-menu__actions">
            <button
              className="signal-label-menu__btn signal-label-menu__btn--primary"
              onClick={(e) => {
                const input = e.currentTarget.closest('#label-context-menu')?.querySelector('input');
                const value = input?.value?.trim();
                if (value && onCreateNewLabelInputSubmit) onCreateNewLabelInputSubmit(value);
              }}
            >Create</button>
            <button
              className="signal-label-menu__btn"
              onClick={() => onAddNewLabelClick && onAddNewLabelClick(false)}
            >Cancel</button>
          </div>
        </div>
      )}

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

      {type === 'persisted' && isEditingPersisted && !isCreatingNewLabelPersisted && (
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
            className="signal-label-menu__btn signal-label-menu__btn--add"
            onClick={onCreateNewPersistedLabelClick}
          >+ Create New Label</button>
          <button
            className="signal-label-menu__btn"
            onClick={onBackPersistedClick}
          >Back</button>
        </div>
      )}

      {type === 'persisted' && isEditingPersisted && isCreatingNewLabelPersisted && (
        <div>
          <div className="signal-label-menu__title">New Label Name:</div>
          <input
            type="text"
            autoFocus
            placeholder="Enter new label name..."
            className="signal-label-menu__input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = e.currentTarget.value.trim();
                if (value && onCreateNewPersistedLabelSubmit) onCreateNewPersistedLabelSubmit(value);
              } else if (e.key === 'Escape') {
                onBackPersistedClick && onBackPersistedClick();
              }
            }}
          />
          <div className="signal-label-menu__actions">
            <button
              className="signal-label-menu__btn signal-label-menu__btn--primary"
              onClick={(e) => {
                const input = e.currentTarget.closest('#label-context-menu')?.querySelector('input');
                const value = input?.value?.trim();
                if (value && onCreateNewPersistedLabelSubmit) onCreateNewPersistedLabelSubmit(value);
              }}
            >Create</button>
            <button
              className="signal-label-menu__btn"
              onClick={onBackPersistedClick}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

