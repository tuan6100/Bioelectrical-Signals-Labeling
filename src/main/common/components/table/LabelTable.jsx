import React, { useEffect, useState, useRef } from 'react'

import './LabelTable.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faFloppyDisk,
    faPencil,
    faPlus,
    faRectangleXmark,
    faTrash,
    faSort,
    faArrowRotateRight
} from "@fortawesome/free-solid-svg-icons"
import {
    fetchCreateAnnotation,
    fetchDeleteAnnotation,
    fetchGetAllLabels,
    fetchUpdateAnnotation
} from "../../api/index.js";

const LabelTable = ({ data, channelId }) => {
    const [selectedId, setSelectedId] = useState(null)
    const selectedIdRef = useRef(selectedId)
    const prevLengthRef = useRef(null)
    const prevRowsMapRef = useRef(new Map())
    const [filterText, setFilterText] = useState('')
    const [sort, setSort] = useState({ key: 'startTimeMs', dir: 'asc' })
    const [newRow, setNewRow] = useState({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' })
    const [editId, setEditId] = useState(null)
    const [editFields, setEditFields] = useState({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' })
    const [allLabels, setAllLabels] = useState([])
    const [labelsLoading, setLabelsLoading] = useState(false)

    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    const isAnnotationRow = (row) =>
        row && typeof row === 'object' &&
        ('startTimeMs' in row) && ('endTimeMs' in row) &&
        (('labelName' in row) || (row.label && row.label.name))

    const allAnnotationMode = Array.isArray(data) && data.length > 0 && data.every(isAnnotationRow)

    useEffect(() => {
        if (!Array.isArray(data) || data.length === 0) {
            if (selectedId !== null) setSelectedId(null)
            prevLengthRef.current = data ? data.length : 0
            prevRowsMapRef.current = new Map()
            return
        }

        const prevLength = prevLengthRef.current
        // Defensive check: đảm bảo phần tử tồn tại trước khi truy cập
        const firstRow = data[0];
        const lastRow = data[data.length - 1];

        const firstId = firstRow ? (firstRow.annotationId ?? firstRow.id) : null;
        const lastId = lastRow ? (lastRow.annotationId ?? lastRow.id) : null;
        const selectedStillExists = data.some(row => row && (row.annotationId ?? row.id) === selectedId)

        const currMap = new Map()
        for (const row of data) {
            if (!row) continue; // Bỏ qua row lỗi
            const id = row.annotationId ?? row.id
            const labelName = row.labelName || row.label?.name || ''
            const note = row.note || ''
            const sig = `${Number(row.startTimeMs) || 0}|${Number(row.endTimeMs) || 0}|${labelName}|${note}`
            currMap.set(id, sig)
        }

        if (prevLength == null) {
            if (firstId && selectedId !== firstId) setSelectedId(firstId)
        } else if (data.length > prevLength) {
            if (lastId && selectedId !== lastId) setSelectedId(lastId)
        } else {
            if (selectedStillExists) {
                try {
                    const prevMap = prevRowsMapRef.current || new Map()
                    let changedId = null
                    let changedCount = 0
                    for (const [id, sig] of currMap.entries()) {
                        if (!prevMap.has(id)) continue
                        if (prevMap.get(id) !== sig) {
                            changedId = id
                            changedCount++
                            if (changedCount > 1) break
                        }
                    }
                } catch (_) {}
            } else {
                if (firstId && selectedId !== firstId) setSelectedId(firstId)
            }
        }

        prevLengthRef.current = data.length
        prevRowsMapRef.current = currMap
    }, [data])

    useEffect(() => {
        const handleAnnotationSelect = (e) => {
            const id = e?.detail?.id
            if (id == null) return
            if (Array.isArray(data)) {
                const exists = data.some(row => row && (row.annotationId ?? row.id) === id)
                if (!exists) return
            }
            setSelectedId(id)
        }
        window.addEventListener('annotation-select', handleAnnotationSelect)
        return () => window.removeEventListener('annotation-select', handleAnnotationSelect)
    }, [data])

    function handleRowClick(e, id) {
        if (e && e.target) {
            const t = e.target;
            const tag = (t.tagName || '').toUpperCase();
            if (t.isContentEditable || ['INPUT','SELECT','TEXTAREA','BUTTON','A','LABEL'].includes(tag)) return;
            if (t.closest('.icon-btn')) return;
        }
        if (id === selectedId) return;
        setSelectedId(id)
        try {
            const evt = new CustomEvent('annotation-select', { detail: { id } })
            window.dispatchEvent(evt)
        } catch (_) {}
    }

    const dispatchAnnotationsUpdated = (nextAnnotations, updatedId) => {
        const evt = new CustomEvent('annotations-updated', {
            detail: { channelId, annotations: nextAnnotations, updatedId }
        })
        window.dispatchEvent(evt)
    }

    const handleCellUpdate = async (id, fields) => {
        if (!id || !fields || typeof fields !== 'object') return
        try {
            const updated = await fetchUpdateAnnotation(id, fields)
            // Nếu update lỗi trả về null/undefined thì không làm gì cả
            if (!updated) return;

            const next = (Array.isArray(data) ? data : []).map(row =>
                row && (row.annotationId ?? row.id) === id
                    ? {
                        ...row,
                        ...(updated?.labelName != null ? { labelName: updated.labelName } : {}),
                        ...(updated?.note !== undefined ? { note: updated.note } : {}),
                        ...(updated?.startTimeMs != null ? { startTimeMs: updated.startTimeMs } : {}),
                        ...(updated?.endTimeMs != null ? { endTimeMs: updated.endTimeMs } : {})
                    }
                    : row
            )
            if (fields.labelName) {
                const nm = (fields.labelName || '').trim()
                if (nm && !allLabels.some(l => (l.name || '').toLowerCase() === nm.toLowerCase())) {
                    setAllLabels(prev => [...prev, { labelId: updated?.labelId ?? Date.now(), name: nm, createdAt: new Date().toISOString() }])
                }
            }
            dispatchAnnotationsUpdated(next, id)
            if (editId === id) {
                setEditId(null)
                setEditFields({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' })
            }
        } catch (err) {
            console.error('Failed to update annotation:', err)
        }
    }

    const handleDelete = async (e, id) => {
        e.preventDefault()
        e.stopPropagation()
        if (!id) return
        const ok = window.confirm('Delete this annotation?')
        if (!ok) return
        try {
            const success = await fetchDeleteAnnotation(id)
            if (!success) throw new Error('Delete failed')
            const next = (Array.isArray(data) ? data : []).filter(row => row && (row.annotationId ?? row.id) !== id)
            dispatchAnnotationsUpdated(next, null)
        } catch (err) {
            console.error('Failed to delete annotation:', err)
        }
    }

    const handleHeaderSort = (key) => {
        setSort(prev => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            }
            return { key, dir: 'asc' }
        })
    }

    const handleReload = async () => {
        setSort({ key: 'startTimeMs', dir: 'asc' })
        setFilterText('')
        try {
            setLabelsLoading(true)
            const rows = await fetchGetAllLabels()
            if (Array.isArray(rows)) setAllLabels(rows)
        } catch (err) {
            console.error('Reload failed (labels):', err)
        } finally {
            setLabelsLoading(false)
        }
    }

    const filteredSortedData = React.useMemo(() => {
        if (!Array.isArray(data)) return data
        // Lọc bỏ dữ liệu rác (null/undefined) để tránh crash khi render
        const safeData = data.filter(r => r !== null && r !== undefined);

        const ft = (filterText || '').trim().toLowerCase()
        const filtered = ft
            ? safeData.filter(row => {
                const label = (row.labelName || row.label?.name || '').toLowerCase()
                const note = (row.note || '').toLowerCase()
                return label.includes(ft) || note.includes(ft)
            })
            : safeData.slice()
        const { key, dir } = sort || {}
        if (!key) return filtered
        const sign = dir === 'desc' ? -1 : 1
        filtered.sort((a, b) => {
            let va = a[key]
            let vb = b[key]
            if (key === 'labelName') {
                va = a.labelName || a.label?.name || ''
                vb = b.labelName || b.label?.name || ''
                return va.localeCompare(vb) * sign
            }
            if (typeof va === 'string') return va.localeCompare(vb) * sign
            return ((Number(va) || 0) - (Number(vb) || 0)) * sign
        })
        return filtered
    }, [data, filterText, sort])

    useEffect(() => {
        let cancelled = false
        async function loadLabels() {
            setLabelsLoading(true)
            try {
                const rows = await fetchGetAllLabels()
                if (!cancelled && Array.isArray(rows)) setAllLabels(rows)
            } catch (err) {
                console.error('Failed to load labels:', err)
            } finally {
                if (!cancelled) setLabelsLoading(false)
            }
        }
        loadLabels()
        return () => { cancelled = true }
    }, [])

    // --- LOGIC CHÍNH ĐÃ SỬA ---
    const handleCreate = async () => {
        const sMs = Number(newRow.startTimeMs)
        const eMs = Number(newRow.endTimeMs)
        const name = (newRow.labelName || '').trim()
        const note = (newRow.note || '').trim()

        // Validation phía client (nếu cần thiết, nếu không backend lo)
        if (isNaN(sMs) || isNaN(eMs)) return;

        try {
            const created = await fetchCreateAnnotation({ channelId, startTime: sMs, endTime: eMs, name, note })

            // --- KIỂM TRA QUAN TRỌNG ---
            // Nếu backend trả về null, undefined hoặc object lỗi (không có id)
            // thì DỪNG LẠI NGAY. Không thêm vào mảng, không clear form.
            if (!created || (created.annotationId == null && created.id == null)) {
                return; // Giữ nguyên trạng thái render cũ
            }

            // Nếu thành công (có ID hợp lệ)
            const createdId = created.annotationId ?? created.id
            const next = [...(Array.isArray(data) ? data : []), created]
            dispatchAnnotationsUpdated(next, createdId)

            if (name && !allLabels.some(l => (l.name || '').toLowerCase() === name.toLowerCase())) {
                setAllLabels(prev => [...prev, { labelId: created?.labelId ?? Date.now(), name, createdAt: new Date().toISOString() }])
            }
            // Chỉ clear form khi thành công
            setNewRow({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' })

        } catch (err) {
            // Lỗi mạng hoặc lỗi JS khác
            console.error('Create failed:', err)
            // Không làm gì cả -> giữ nguyên trạng thái render
        }
    }

    const handleEdit = async (e, row) => {
        e.preventDefault()
        e.stopPropagation()
        const id = row.annotationId ?? row.id
        const fields = {}
        const trimmedLabel = (editFields.labelName || '').trim()
        if (trimmedLabel !== (row.labelName || row.label?.name || '')) {
            fields.labelName = trimmedLabel
        }
        if ((editFields.note || '') !== (row.note || '')) {
            fields.note = editFields.note || ''
        }
        if (editFields.startTimeMs !== '' && editFields.startTimeMs !== row.startTimeMs) {
            fields.startTimeMs = editFields.startTimeMs
        }
        if (editFields.endTimeMs !== '' && editFields.endTimeMs !== row.endTimeMs) {
            fields.endTimeMs = editFields.endTimeMs
        }
        if (Object.keys(fields).length > 0) {
            await handleCellUpdate(id, fields)
        } else {
            setEditId(null)
        }
    }

    useEffect(() => {
        const handleAnnotationsUpdated = (e) => {
            const detail = e?.detail
            if (!detail) return
            if (detail.channelId != null && detail.channelId !== channelId) return
        }
        window.addEventListener('annotations-updated', handleAnnotationsUpdated)
        return () => window.removeEventListener('annotations-updated', handleAnnotationsUpdated)
    }, [channelId])

    const hasInputData =
        newRow.startTimeMs !== '' ||
        newRow.endTimeMs !== '' ||
        newRow.labelName.trim() !== '' ||
        newRow.note.trim() !== '';

    return (
        <div className="table-container">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                    type="text"
                    value={filterText}
                    className="filter-input"
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Filter by label or note..."
                    style={{ flex: 1, minWidth: 120 }}
                />

                <button
                    className="icon-btn"
                    onClick={handleReload}
                    title="Reload & reset sort"
                    aria-label="Reload"
                >
                    <FontAwesomeIcon icon={faArrowRotateRight} />
                </button>
            </div>
            {(() => {
                const displayedRowsCount = allAnnotationMode
                    ? (Array.isArray(filteredSortedData) ? filteredSortedData.length : 0)
                    : (Array.isArray(data) ? data.length : 0)
                const needScroll = displayedRowsCount > 5
                return (
                    <div className={needScroll ? 'table-viewport' : ''}>
                        <table>
                            <thead>
                            <tr>
                                <th>
                                    <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('startTimeMs')}>
                                        Start (ms)
                                    </span>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleHeaderSort('startTimeMs')}
                                        title={`Sort by Start (current: ${sort.key==='startTimeMs'?sort.dir:'none'})`}
                                        style={{ marginLeft: 4 }}
                                    >
                                        <FontAwesomeIcon icon={faSort} />
                                    </button>
                                </th>
                                <th>
                                    <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('endTimeMs')}>
                                        End (ms)
                                    </span>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleHeaderSort('endTimeMs')}
                                        title={`Sort by End (current: ${sort.key==='endTimeMs'?sort.dir:'none'})`}
                                        style={{ marginLeft: 4 }}
                                    >
                                        <FontAwesomeIcon icon={faSort} />
                                    </button>
                                </th>
                                <th>
                                    <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('labelName')}>
                                        Label
                                    </span>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleHeaderSort('labelName')}
                                        title={`Sort by Label (current: ${sort.key==='labelName'?sort.dir:'none'})`}
                                        style={{ marginLeft: 4 }}
                                    >
                                        <FontAwesomeIcon icon={faSort} />
                                    </button>
                                </th>
                                <th>
                                    <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('note')}>
                                        Note
                                    </span>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleHeaderSort('note')}
                                        title={`Sort by Note (current: ${sort.key==='note'?sort.dir:'none'})`}
                                        style={{ marginLeft: 4 }}
                                    >
                                        <FontAwesomeIcon icon={faSort} />
                                    </button>
                                </th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {!Array.isArray(data) || data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{height: '15px', color: '#aaa'}}>
                                        (No data)
                                    </td>
                                </tr>
                            ) : (
                                filteredSortedData.map((row) => {
                                    // --- DEFENSIVE CHECK: Bỏ qua nếu row không hợp lệ ---
                                    if (!row) return null;

                                    const id = row.annotationId ?? row.id
                                    const labelName = row.labelName || row.label?.name || 'Unknown'
                                    const note = row.note || ''
                                    const isEditing = id === editId

                                    return (
                                        <tr
                                            key={id}
                                            data-annotation-id={id}
                                            className={(() => {
                                                if (id !== selectedId) return ''
                                                const ln = (labelName || '').toLowerCase()
                                                return ln === 'unknown' ? 'highlight-unknown' : 'highlight'
                                            })()}
                                            onClick={(e) => {
                                                if (!isEditing) handleRowClick(e, id)
                                            }}
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !isEditing) handleRowClick(e, id) }}
                                            style={{ cursor: isEditing ? 'default' : 'pointer' }}
                                        >
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="edit-input"
                                                        value={editFields.startTimeMs ?? ''}
                                                        onChange={(e) => setEditFields(f => ({ ...f, startTimeMs: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '100%' }}
                                                    />
                                                ) : (
                                                    row.startTimeMs
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="edit-input"
                                                        value={editFields.endTimeMs ?? ''}
                                                        onChange={(e) => setEditFields(f => ({ ...f, endTimeMs: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '100%' }}
                                                    />
                                                ) : (
                                                    row.endTimeMs
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="edit-input"
                                                        list="label-options"
                                                        value={editFields.labelName ?? ''}
                                                        onChange={(e) => setEditFields(f => ({ ...f, labelName: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '100%' }}
                                                    />
                                                ) : (
                                                    <span>{labelName}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="edit-input"
                                                        value={editFields.note ?? ''}
                                                        onChange={(e) => setEditFields(f => ({ ...f, note: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => { if(e.key === 'Enter') e.stopPropagation() }}
                                                        style={{ width: '100%' }}
                                                    />
                                                ) : (
                                                    note
                                                )}
                                            </td>
                                            <td className={`action-links`} onClick={(e) => e.stopPropagation()}>
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            className="icon-btn editing"
                                                            onClick={(e) => handleEdit(e, row)}
                                                            title="Save changes"
                                                            style={{ marginRight: 8 }}
                                                        >
                                                            <FontAwesomeIcon icon={faFloppyDisk} />
                                                        </button>

                                                        <button
                                                            className="icon-btn editing"
                                                            title="Cancel editing"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setEditId(null)
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faRectangleXmark} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="icon-btn editing"
                                                            title="Edit annotation"
                                                            style={{ marginRight: 8 }}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setEditId(id)
                                                                setEditFields({
                                                                    labelName: labelName || '',
                                                                    note: note || '',
                                                                    startTimeMs: String(row.startTimeMs ?? ''),
                                                                    endTimeMs: String(row.endTimeMs ?? '')
                                                                })
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faPencil} />
                                                        </button>

                                                        <button
                                                            className="icon-btn editing"
                                                            title="Delete annotation"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                handleDelete(e, id)
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                            <tr>
                                <td>
                                    <input
                                        type="number"
                                        placeholder="Start (ms)"
                                        className="input-label-detail"
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
                                        className="input-label-detail"
                                        value={newRow.endTimeMs}
                                        onChange={(e) => setNewRow(r => ({ ...r, endTimeMs: e.target.value }))}
                                        style={{ width: '100%' }}
                                        title="End time in milliseconds"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        list="label-options"
                                        className="input-label-detail"
                                        placeholder={labelsLoading ? 'Loading labels...' : 'Label name'}
                                        value={newRow.labelName}
                                        onChange={(e) => setNewRow(r => ({ ...r, labelName: e.target.value }))}
                                        style={{ width: '100%' }}
                                        disabled={labelsLoading}
                                    />
                                    <datalist id="label-options">
                                        {allLabels.map(l => (
                                            <option key={l.labelId} value={l.name} />
                                        ))}
                                    </datalist>
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        placeholder="Note"
                                        className="input-label-detail"
                                        value={newRow.note}
                                        onChange={(e) => setNewRow(r => ({ ...r, note: e.target.value }))}
                                        style={{ width: '100%' }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                    />
                                </td>
                                <td>
                                    <button
                                        className="icon-btn"
                                        onClick={handleCreate}
                                        title={hasInputData ? "Add new annotation" : "Enter details to add"}
                                        disabled={!hasInputData}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                    </button>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                )
            })()}
        </div>
    )
}

export default LabelTable