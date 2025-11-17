import React, { useEffect, useState } from 'react';
import {fetchUpdateAnnotation, fetchDeleteAnnotation, fetchCreateLabel, fetchShowErrorDialog} from '../../api/index.js';
import LabelTableRow from './LabelTableRow.jsx';
import './LabelTable.css'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faFloppyDisk, faPencil, faPlus, faRectangleXmark, faTrash} from "@fortawesome/free-solid-svg-icons";

const LabelTable = ({ data, onDeleteRow, onLabelChange, channelId }) => {
  const [selectedId, setSelectedId] = useState(null);
  const prevLengthRef = React.useRef(null);
  const [filterText, setFilterText] = useState('');
  const [sort, setSort] = useState({ key: 'startTimeMs', dir: 'asc' });
  const [newRow, setNewRow] = useState({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' });
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' });

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

  useEffect(() => {
    const handleAnnotationSelect = (e) => {
      const id = e?.detail?.id;
      if (id == null) return;
      if (Array.isArray(data)) {
        const exists = data.some(row => (row.annotationId ?? row.id) === id);
        if (!exists) return;
      }
      setSelectedId(id);
    };
    window.addEventListener('annotation-select', handleAnnotationSelect);
    return () => window.removeEventListener('annotation-select', handleAnnotationSelect);
  }, [data]);

  function handleRowClick(id) {
    setSelectedId(id);
    try {
      const evt = new CustomEvent('annotation-select', { detail: { id } });
      window.dispatchEvent(evt);
    } catch (_) {
    }
  }

  const dispatchAnnotationsUpdated = (nextAnnotations) => {
    try {
      const evt = new CustomEvent('annotations-updated', {
        detail: { channelId, annotations: nextAnnotations }
      });
      window.dispatchEvent(evt);
    } catch (_) {}
  };

  const handleCellUpdate = async (id, fields) => {
    if (!id || !fields || typeof fields !== 'object') return;
    try {
      const updated = await fetchUpdateAnnotation(id, fields);
      const next = (Array.isArray(data) ? data : []).map(row =>
        (row.annotationId ?? row.id) === id
          ? {
              ...row,
              ...(updated?.labelName != null ? { labelName: updated.labelName } : {}),
              ...(updated?.note !== undefined ? { note: updated.note } : {}),
              ...(updated?.startTimeMs != null ? { startTimeMs: updated.startTimeMs } : {}),
              ...(updated?.endTimeMs != null ? { endTimeMs: updated.endTimeMs } : {})
            }
          : row
      );
      dispatchAnnotationsUpdated(next);
      if (editId === id) {
        setEditId(null);
        setEditFields({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' });
      }
    } catch (err) {
      console.error('Failed to update annotation:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;
    const ok = window.confirm('Delete this annotation?');
    if (!ok) return;
    try {
      const success = await fetchDeleteAnnotation(id);
      if (!success) throw new Error('Delete failed');
      const next = (Array.isArray(data) ? data : []).filter(row => (row.annotationId ?? row.id) !== id);
      dispatchAnnotationsUpdated(next);
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

    const formatMs = (ms, decimalPlaces = 2) => {
        if (ms === null || ms === undefined || ms === '') return ''
        let n = Number(ms)
        if (!Number.isFinite(n)) return ''
        if (decimalPlaces < 0) decimalPlaces = 0
        if (Math.abs(n) >= 1000) {
            const seconds = n / 1000
            return `${seconds.toFixed(decimalPlaces)}`
        }
        return `${n.toFixed(decimalPlaces)}`
    }


    const handleHeaderSort = (key) => {
    setSort(prev => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  const filteredSortedData = React.useMemo(() => {
    if (!Array.isArray(data)) return data;
    const ft = (filterText || '').trim().toLowerCase();
    const filtered = ft
      ? data.filter(row => {
          const label = (row.labelName || row.label?.name || '').toLowerCase();
          const note = (row.note || '').toLowerCase();
          return label.includes(ft) || note.includes(ft);
        })
      : data.slice();
    const { key, dir } = sort || {};
    if (!key) return filtered;
    const sign = dir === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (key === 'labelName') {
        va = a.labelName || a.label?.name || '';
        vb = b.labelName || b.label?.name || '';
        return va.localeCompare(vb) * sign;
      }
      if (typeof va === 'string') return va.localeCompare(vb) * sign;
      return ((Number(va) || 0) - (Number(vb) || 0)) * sign;
    });
    return filtered;
  }, [data, filterText, sort]);

  const handleCreate = async () => {
    const sMs = Number(newRow.startTimeMs);
    const eMs = Number(newRow.endTimeMs);
    const name = (newRow.labelName || '').trim();
    const note = (newRow.note || '').trim();
    if (!Number.isFinite(sMs) || !Number.isFinite(eMs) || !name || !channelId) {
      await fetchShowErrorDialog('Failed to create', 'Please set Start, End (ms) and Label, and ensure a channel is selected.');
      return;
    }
    if (eMs <= sMs) {
      await fetchShowErrorDialog('Failed to create', 'End time must be greater than Start time.');
      return;
    }
    try {
      const created = await fetchCreateLabel({ channelId, startTime: Math.round(sMs), endTime: Math.round(eMs), name, note });
      const next = [...(Array.isArray(data) ? data : []), created];
      dispatchAnnotationsUpdated(next);
      setNewRow({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' });
    } catch (err) {
    }
  };

  const handleSaveLabelEdited =async (e, row) => {
      e.preventDefault();
      e.stopPropagation();
      const id = row.annotationId ?? row.id;
      const trimmedLabel = (editFields.labelName || '').trim();
      const fields = {};
      if (trimmedLabel !== (row.labelName || row.label?.name || '')) fields.labelName = trimmedLabel;
      if ((editFields.note || '') !== (row.note || '')) fields.note = editFields.note || '';
      const startVal = editFields.startTimeMs === '' ? row.startTimeMs : Number(editFields.startTimeMs);
      const endVal = editFields.endTimeMs === '' ? row.endTimeMs : Number(editFields.endTimeMs);
      const startChanged = editFields.startTimeMs !== '' && Number(startVal) !== Number(row.startTimeMs);
      const endChanged = editFields.endTimeMs !== '' && Number(endVal) !== Number(row.endTimeMs);
      if (startChanged) fields.startTimeMs = Math.round(Number(startVal));
      if (endChanged) fields.endTimeMs = Math.round(Number(endVal));
      if ((fields.startTimeMs !== undefined || fields.endTimeMs !== undefined)) {
          const s = fields.startTimeMs !== undefined ? fields.startTimeMs : row.startTimeMs;
          const eMs = fields.endTimeMs !== undefined ? fields.endTimeMs : row.endTimeMs;
          if (!Number.isFinite(s) || !Number.isFinite(eMs) || eMs <= s) {
              await fetchShowErrorDialog('Failed to update', 'Please ensure Start/End are valid ms and End > Start.');
              return;
          }
      }
      if (Object.keys(fields).length > 0) await handleCellUpdate(id, fields);
      else setEditId(null);
  }

  return (
    <div className="table-container">
      {allAnnotationMode && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter by label or note..."
            style={{ flex: 1, minWidth: 120 }}
          />
        </div>
      )}
      {(() => {
        const displayedRowsCount = allAnnotationMode
          ? (Array.isArray(filteredSortedData) ? filteredSortedData.length : 0)
          : (Array.isArray(data) ? data.length : 0);
        const needScroll = displayedRowsCount > 5;
        return (
          <div className={needScroll ? 'table-viewport' : ''}>
            <table>
        <thead>
          {allAnnotationMode ? (
            <tr>
              <th onClick={() => handleHeaderSort('startTimeMs')} style={{cursor:'pointer'}}>Start (ms)</th>
              <th onClick={() => handleHeaderSort('endTimeMs')} style={{cursor:'pointer'}}>End (ms)</th>
              <th onClick={() => handleHeaderSort('labelName')} style={{cursor:'pointer'}}>Label</th>
              <th onClick={() => handleHeaderSort('note')} style={{cursor:'pointer'}}>Note</th>
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
              filteredSortedData.map((row) => {
                const id = row.annotationId ?? row.id;
                const labelName = row.labelName || row.label?.name || 'Unknown';
                const note = row.note || '';
                return (
                  <tr
                    key={id}
                    className={(() => {
                      if (id !== selectedId) return '';
                      const ln = (labelName || '').toLowerCase();
                      return ln === 'unknown' ? 'highlight-unknown' : 'highlight';
                    })()}
                    onClick={() => handleRowClick(id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      {id === editId ? (
                        <input
                          type="number"
                          value={editFields.startTimeMs}
                          onChange={(e) => setEditFields(f => ({ ...f, startTimeMs: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        formatMs(row.startTimeMs)
                      )}
                    </td>
                    <td>
                      {id === editId ? (
                        <input
                          type="number"
                          value={editFields.endTimeMs}
                          onChange={(e) => setEditFields(f => ({ ...f, endTimeMs: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        formatMs(row.endTimeMs)
                      )}
                    </td>
                    <td>
                      {id === editId ? (
                        <input
                          type="text"
                          value={editFields.labelName}
                          onChange={(e) => setEditFields(f => ({ ...f, labelName: e.target.value }))}
                          style={{ width: '100%' }}
                          autoFocus
                        />
                      ) : (
                        <span>{labelName}</span>
                      )}
                    </td>
                    <td>
                      {id === editId ? (
                        <input
                          type="text"
                          value={editFields.note}
                          onChange={(e) => setEditFields(f => ({ ...f, note: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        note
                      )}
                    </td>
                    <td className="action-links" style={{ display: 'flex', gap: 8 }}>
                      {id === editId ? (
                        <>
                            <FontAwesomeIcon
                                icon={faFloppyDisk}
                                title="Save"
                                aria-label="Save"
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => handleSaveLabelEdited(e, row)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSaveLabelEdited(e, row);
                                  }
                                }}
                            />

                            <FontAwesomeIcon
                                icon={faRectangleXmark}
                                title="Cancel"
                                aria-label="Cancel"
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setEditId(null);
                                  }
                                }}
                            />
                        </>
                      ) : (
                        <>
                            <FontAwesomeIcon
                                icon={faPencil}
                                title="Edit"
                                aria-label="Edit"
                                role="button"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedId(id);
                                    setEditId(id);
                                    setEditFields({
                                        labelName: labelName || '',
                                        note: note || '',
                                        startTimeMs: String(row.startTimeMs ?? ''),
                                        endTimeMs: String(row.endTimeMs ?? '')
                                    });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedId(id);
                                        setEditId(id);
                                        setEditFields({
                                            labelName: labelName || '',
                                            note: note || '',
                                            startTimeMs: String(row.startTimeMs ?? ''),
                                            endTimeMs: String(row.endTimeMs ?? '')
                                        });
                                    }
                                }}
                            />

                            <FontAwesomeIcon
                                icon={faTrash}
                                title="Delete"
                                aria-label="Delete"
                                tabIndex={0}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    if (allAnnotationMode) return handleDelete(e, id);
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDeleteRow && onDeleteRow(id);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (allAnnotationMode) return handleDelete(e, id);
                                        onDeleteRow && onDeleteRow(id);
                                    }
                                }}
                            />

                        </>
                      )}
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
          {allAnnotationMode && (
            <tr>
              <td>
                <input
                  type="number"
                  placeholder="Start (ms)"
                  value={newRow.startTimeMs}
                  onChange={(e) => setNewRow(r => ({ ...r, startTimeMs: e.target.value }))}
                  style={{ width: '100%' }}
                  title="Start time in milliseconds"
                />
              </td>
              <td>
                <input
                  type="number"
                  placeholder="End (ms)"
                  value={newRow.endTimeMs}
                  onChange={(e) => setNewRow(r => ({ ...r, endTimeMs: e.target.value }))}
                  style={{ width: '100%' }}
                  title="End time in milliseconds"
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="Label"
                  value={newRow.labelName}
                  onChange={(e) => setNewRow(r => ({ ...r, labelName: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="Note"
                  value={newRow.note}
                  onChange={(e) => setNewRow(r => ({ ...r, note: e.target.value }))}
                  style={{ width: '100%' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                />
              </td>
              <td>
                  <FontAwesomeIcon
                      icon={faPlus}
                      onClick={handleCreate}
                      role="button"
                      tabIndex={0}
                      title="Create"
                      style={{ cursor: 'pointer' }}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCreate();
                          }
                      }}
                  />
              </td>
            </tr>
          )}
        </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
};


export default LabelTable;
