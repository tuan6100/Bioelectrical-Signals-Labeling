import React, { useEffect, useState } from 'react';
import LabelTableRow from './LabelTableRow.jsx';
import './LabelTable.css'

const LabelTable = ({ data, onDeleteRow, onLabelChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const prevLengthRef = React.useRef(null);

  const isAnnotationRow = (row) =>
    row && (typeof row === 'object') &&
    ('startTimeMs' in row) && ('endTimeMs' in row) && (('labelName' in row) || (row.label && row.label.name));

  const allAnnotationMode = Array.isArray(data) && data.length > 0 && data.every(isAnnotationRow);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setSelectedId(null);
      prevLengthRef.current = data ? data.length : 0;
      return;
    }
    const prevLength = prevLengthRef.current;
    if (prevLength == null) {
      setSelectedId((data[0].annotationId ?? data[0].id));
    } else if (data.length > prevLength) {
      const last = data[data.length - 1];
      setSelectedId((last.annotationId ?? last.id));
    } else {
      setSelectedId((data[0].annotationId ?? data[0].id));
    }
    prevLengthRef.current = data.length;
  }, [data]);

  function handleRowClick(id) {
    setSelectedId(id);
  }

  const formatMs = (ms) => {
    if (ms == null) return '';
    // show seconds with 3 decimals for readability
    const s = Number(ms) / 1000;
    return `${s.toFixed(3)} s`;
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          {allAnnotationMode ? (
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Label</th>
              <th>Note</th>
              <th>Action</th>
            </tr>
          ) : (
            <tr>
              <th>Điểm giây bắt đầu</th>
              <th>Điểm giây kết thúc</th>
              <th>Label 1</th>
              <th>Label 2</th>
              <th>Label 3</th>
              <th>Label 4</th>
              <th>Label 5</th>
              <th>Hành động</th>
            </tr>
          )}
        </thead>
        <tbody>
          {!Array.isArray(data) || data.length === 0 ? (
            <tr>
              <td colSpan={allAnnotationMode ? 5 : 8} style={{height: '30px', color: '#aaa'}}>
                (No data)
              </td>
            </tr>
          ) : (
            allAnnotationMode ? (
              data.map((row) => {
                const id = row.annotationId ?? row.id;
                const labelName = row.labelName || row.label?.name || 'Unknown';
                const note = row.note || '';
                return (
                  <tr
                    key={id}
                    className={id === selectedId ? 'highlight' : ''}
                    onClick={() => handleRowClick(id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatMs(row.startTimeMs)}</td>
                    <td>{formatMs(row.endTimeMs)}</td>
                    <td>{labelName}</td>
                    <td>{note}</td>
                    <td className="action-links">
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRow && onDeleteRow(id); }}
                      >
                        Delete
                      </a>
                    </td>
                  </tr>
                )
              })
            ) : (
              data.map((row) => (
                <LabelTableRow
                  key={row.id}
                  data={row}
                  onDelete={onDeleteRow}
                  isHighlight={row.id === selectedId}
                  onRowClick={handleRowClick}
                  onLabelChange={onLabelChange}
                />
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  );
};


export default LabelTable;
