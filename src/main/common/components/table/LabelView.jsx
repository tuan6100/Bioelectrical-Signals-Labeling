import React, { useEffect, useState } from 'react';
import LabelTableRow from './LabelTableRow.jsx';

const LabelView = ({ labels, onDeleteRow, onLabelChange }) => {
    const [selectedId, setSelectedId] = useState(null);
    const prevLengthRef = React.useRef(null);

    useEffect(() => {
        if (!Array.isArray(labels) || labels.length === 0) {
            setSelectedId(null);
            prevLengthRef.current = labels ? labels.length : 0;
            return;
        }

        const prevLength = prevLengthRef.current;

        if (prevLength == null) {
            setSelectedId(labels[0].annotationId);
        } else if (labels.length > prevLength) {
            setSelectedId(labels[labels.length - 1].annotationId);
        } else {
            setSelectedId(labels[0].annotationId);
        }

        prevLengthRef.current = labels.length;
    }, [labels]);

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
                {labels.length === 0 ? (
                    <tr>
                        <td colSpan="8" style={{height: '30px', color: '#aaa'}}>
                            (No data)
                        </td>
                    </tr>
                ) : (
                    labels.map((row) => (
                        <LabelTableRow
                            key={row.annotationId}
                            data={row}
                            onDelete={onDeleteRow}
                            isHighlight={row.annotationId === selectedId}
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


export default LabelView;
