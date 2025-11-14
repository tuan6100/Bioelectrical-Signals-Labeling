import React from 'react';
import LabelTableRow from './LabelTableRow';

const LabelTable = ({ data, onDeleteRow }) => {
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
            data.map((row, index) => (
              <LabelTableRow
                key={row.id}
                data={row}
                onDelete={onDeleteRow}
                isHighlight={index === 0}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LabelTable;
