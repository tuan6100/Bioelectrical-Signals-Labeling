import React, { useState } from 'react';

const DISEASE_OPTIONS = ['bệnh a', 'bệnh b', 'bệnh c', 'bệnh d', 'bệnh e'];

const LabelTableRow = ({ data, onDelete, isHighlight, onRowClick, onLabelChange }) => {
  const [customInputs, setCustomInputs] = useState({});
  const [expandedCustom, setExpandedCustom] = useState({});

  function handleRowClick() {
    onRowClick && onRowClick(data.id);
  }

  function handleLabelChange(labelField, value) {
    onLabelChange && onLabelChange(data.id, labelField, value);
  }

  function handleCustomInputChange(labelField, value) {
    setCustomInputs(prev => ({ ...prev, [labelField]: value }));
  }

  function handleCustomInputSubmit(labelField) {
    const customValue = customInputs[labelField];
    if (customValue && customValue.trim()) {
      handleLabelChange(labelField, customValue);
      setCustomInputs(prev => ({ ...prev, [labelField]: '' }));
      setExpandedCustom(prev => ({ ...prev, [labelField]: false }));
    }
  }

  function renderLabelDropdown(labelField, labelValue) {
    const isShowingCustom = expandedCustom[labelField];
    const isCustomValue = !DISEASE_OPTIONS.includes(labelValue) && labelValue;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {isCustomValue && !isShowingCustom ? (
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              padding: '4px',
              backgroundColor: '#f0f0f0',
              borderRadius: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #ccc'
            }}
          >
            <span>{labelValue}</span>
            <button
              onClick={() => setExpandedCustom(prev => ({ ...prev, [labelField]: true }))}
              style={{
                padding: '2px 6px',
                borderRadius: '2px',
                border: 'none',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Sửa
            </button>
          </div>
        ) : (
          <>
            <select
              value={DISEASE_OPTIONS.includes(labelValue) ? labelValue : ''}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setExpandedCustom(prev => ({ ...prev, [labelField]: true }));
                } else if (e.target.value) {
                  handleLabelChange(labelField, e.target.value);
                  setExpandedCustom(prev => ({ ...prev, [labelField]: false }));
                }
              }}
              style={{
                width: '100%',
                padding: '4px',
                borderRadius: '3px',
                border: '1px solid #ccc',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              <option value="">-- Chọn --</option>
              {DISEASE_OPTIONS.map((disease) => (
                <option key={disease} value={disease}>
                  {disease}
                </option>
              ))}
              <option value="custom">+ Thêm tùy chỉnh</option>
            </select>

            {isShowingCustom && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="Nhập giá trị..."
                  value={customInputs[labelField] || ''}
                  onChange={(e) => handleCustomInputChange(labelField, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomInputSubmit(labelField);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '4px',
                    borderRadius: '3px',
                    border: '1px solid #007bff',
                    fontSize: '12px'
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handleCustomInputSubmit(labelField)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: '#007bff',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <tr
      className={isHighlight ? 'highlight' : ''}
      onClick={handleRowClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(); }}
      style={{ cursor: 'pointer' }}
    >
      <td>{data.startSecond || ''}</td>
      <td>{data.endSecond || ''}</td>
      <td>{renderLabelDropdown('label1', data.label1)}</td>
      <td>{renderLabelDropdown('label2', data.label2)}</td>
      <td>{renderLabelDropdown('label3', data.label3)}</td>
      <td>{renderLabelDropdown('label4', data.label4)}</td>
      <td>{renderLabelDropdown('label5', data.label5)}</td>
      <td className="action-links">
        <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(data.id); }}>
          Delete
        </a>
      </td>
    </tr>
  );
};

export default LabelTableRow;
