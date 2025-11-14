import React from 'react';

const LabelTableRow = ({ data, onDelete, isHighlight }) => {
  return (
    <tr className={isHighlight ? 'highlight' : ''}>
      <td>{data.startSecond || ''}</td>
      <td>{data.endSecond || ''}</td>
      <td>{data.label1 || ''}</td>
      <td>{data.label2 || ''}</td>
      <td>{data.label3 || ''}</td>
      <td>{data.label4 || ''}</td>
      <td>{data.label5 || ''}</td>
      <td className="action-links">
        <a href="#" onClick={(e) => { e.preventDefault(); onDelete(data.id); }}>
          Delete
        </a>
      </td>
    </tr>
  );
};

export default LabelTableRow;
