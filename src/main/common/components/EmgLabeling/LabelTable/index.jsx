import React, { useEffect, useState } from 'react';
import LabelTableRow from './LabelTableRow';

const LabelTable = ({ data, onDeleteRow, onLabelChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const prevLengthRef = React.useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      setSelectedId(null);
      prevLengthRef.current = data ? data.length : 0;
      return;
    }

    const prevLength = prevLengthRef.current;

    if (prevLength == null) {
      setSelectedId(data[0].id);
    } else if (data.length > prevLength) {
      setSelectedId(data[data.length - 1].id);
    } else {
      setSelectedId(data[0].id);
    }

    prevLengthRef.current = data.length;
  }, [data]);

  function handleRowClick(id) {
    setSelectedId(id);
  }

  return (
    <div className="table-container">
      <table>
        <thead>
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
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="8" style={{height: '30px', color: '#aaa'}}>
                (No data)
              </td>
            </tr>
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
          )}
        </tbody>
      </table>
    </div>
  );
};

  
export default LabelTable;
