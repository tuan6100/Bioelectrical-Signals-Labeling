import React, { useEffect, useState, useRef } from 'react'
import {
    fetchUpdateAnnotation,
    fetchDeleteAnnotation,
    fetchCreateLabel,
    fetchShowErrorDialog,
    fetchGetAllLabels
} from '../../api/index.js'
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

const LabelTable = ({ data, channelId }) => {
    const [selectedId, setSelectedId] = useState(null)
    const selectedIdRef = useRef(selectedId)
    const prevLengthRef = useRef(null)
    const prevRowsMapRef = useRef(new Map())
    const [filterText, setFilterText] = useState('')
    const [sort, setSort] = useState({ key: '', dir: '' })
    const [newRow, setNewRow] = useState({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' })
    const [editId, setEditId] = useState(null)
    const [editFields, setEditFields] = useState({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' })
    const [allLabels, setAllLabels] = useState([])
    const [labelsLoading, setLabelsLoading] = useState(false)
    const [flashTrigger, setFlashTrigger] = useState(0)

    useEffect(() => {
        selectedIdRef.current = selectedId
        console.log('Selected ID changed:', selectedId)
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
        const firstId = (data[0].annotationId ?? data[0].id)
        const lastId = (data[data.length - 1].annotationId ?? data[data.length - 1].id)
        const selectedStillExists = data.some(row => (row.annotationId ?? row.id) === selectedId)

        const currMap = new Map()
        for (const row of data) {
            const id = row.annotationId ?? row.id
            const labelName = row.labelName || row.label?.name || ''
            const note = row.note || ''
            const sig = `${Number(row.startTimeMs) || 0}|${Number(row.endTimeMs) || 0}|${labelName}|${note}`
            currMap.set(id, sig)
        }

        if (prevLength == null) {
            if (selectedId !== firstId) setSelectedId(firstId)
        } else if (data.length > prevLength) {
            if (selectedId !== lastId) setSelectedId(lastId)
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
                    if (prevLength === data.length && changedCount === 1 && changedId != null) {
                        flashSelect(changedId)
                    }
                } catch (_) {}
            } else {
                if (selectedId !== firstId) setSelectedId(firstId)
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
                const exists = data.some(row => (row.annotationId ?? row.id) === id)
                if (!exists) return
            }
            setSelectedId(id)
            setFlashTrigger(t => t + 1)
        }
        window.addEventListener('annotation-select', handleAnnotationSelect)
        console.log('Added annotation-select listener')
        return () => window.removeEventListener('annotation-select', handleAnnotationSelect)
    }, [data])

    function handleRowClick(e, id) {
        if (e && e.target) {
            const t = e.target;
            const tag = (t.tagName || '').toUpperCase();
            if (t.isContentEditable || ['INPUT','SELECT','TEXTAREA','BUTTON','A','LABEL'].includes(tag)) return;
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

    function flashSelect(id) {
        if (selectedIdRef.current !== id) {
            setSelectedId(id)
        }
        setFlashTrigger(t => t + 1)
    }

    const handleCellUpdate = async (id, fields) => {
        if (!id || !fields || typeof fields !== 'object') return
        try {
            const updated = await fetchUpdateAnnotation(id, fields)
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
            )

            flashSelect(id)
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
            const next = (Array.isArray(data) ? data : []).filter(row => (row.annotationId ?? row.id) !== id)
            dispatchAnnotationsUpdated(next, null)
        } catch (err) {
            console.error('Failed to delete annotation:', err)
        }
    }

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
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            }
            return { key, dir: 'asc' }
        })
    }

    const handleReload = async () => {
        setSort({ key: '', dir: '' })
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
        const ft = (filterText || '').trim().toLowerCase()
        const filtered = ft
            ? data.filter(row => {
                const label = (row.labelName || row.label?.name || '').toLowerCase()
                const note = (row.note || '').toLowerCase()
                return label.includes(ft) || note.includes(ft)
            })
            : data.slice()
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

    const handleCreate = async () => {
        const sMs = Number(newRow.startTimeMs)
        const eMs = Number(newRow.endTimeMs)
        const name = (newRow.labelName || '').trim()
        const note = (newRow.note || '').trim()
        if (!Number.isFinite(sMs) || !Number.isFinite(eMs) || !name || !channelId) {
            await fetchShowErrorDialog('Failed to create', 'Please set Start, End (ms) and Label, and ensure a channel is selected.')
            return
        }
        if (eMs <= sMs) {
            await fetchShowErrorDialog('Failed to create', 'End time must be greater than Start time.')
            return
        }
        try {
            const created = await fetchCreateLabel({ channelId, startTime: Math.round(sMs), endTime: Math.round(eMs), name, note })
            const createdId = created?.annotationId ?? created?.id
            const next = [...(Array.isArray(data) ? data : []), created]
            flashSelect(createdId)
            dispatchAnnotationsUpdated(next, createdId)
            if (name && !allLabels.some(l => (l.name || '').toLowerCase() === name.toLowerCase())) {
                setAllLabels(prev => [...prev, { labelId: created?.labelId ?? Date.now(), name, createdAt: new Date().toISOString() }])
            }
            setNewRow({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' })
        } catch (err) {
            console.error('Create failed:', err)
        }
    }

    const handleSaveLabelEdited = async (e, row) => {
        e.preventDefault()
        e.stopPropagation()
        const id = row.annotationId ?? row.id
        const trimmedLabel = (editFields.labelName || '').trim()
        const fields = {}
        if (trimmedLabel !== (row.labelName || row.label?.name || '')) fields.labelName = trimmedLabel
        if ((editFields.note || '') !== (row.note || '')) fields.note = editFields.note || ''
        const startVal = editFields.startTimeMs === '' ? row.startTimeMs : Number(editFields.startTimeMs)
        const endVal = editFields.endTimeMs === '' ? row.endTimeMs : Number(editFields.endTimeMs)
        const startChanged = editFields.startTimeMs !== '' && Number(startVal) !== Number(row.startTimeMs)
        const endChanged = editFields.endTimeMs !== '' && Number(endVal) !== Number(row.endTimeMs)
        if (startChanged) fields.startTimeMs = Math.round(Number(startVal))
        if (endChanged) fields.endTimeMs = Math.round(Number(endVal))
        if ((fields.startTimeMs !== undefined || fields.endTimeMs !== undefined)) {
            const s = fields.startTimeMs !== undefined ? fields.startTimeMs : row.startTimeMs
            const eMs = fields.endTimeMs !== undefined ? fields.endTimeMs : row.endTimeMs
            if (!Number.isFinite(s) || !Number.isFinite(eMs) || eMs <= s) {
                await fetchShowErrorDialog('Failed to update', 'Please ensure Start/End are valid ms and End > Start.')
                return
            }
        }
        if (Object.keys(fields).length > 0) await handleCellUpdate(id, fields)
        else setEditId(null)
    }

    useEffect(() => {
        const handleAnnotationsUpdated = (e) => {
            const detail = e?.detail
            if (!detail) return
            if (detail.channelId != null && detail.channelId !== channelId) return
            const { annotations: nextAnn, updatedId } = detail
            if (updatedId != null) {
                const exists = Array.isArray(nextAnn) && nextAnn.some(r => (r.annotationId ?? r.id) === updatedId)
                if (exists) {
                    flashSelect(updatedId)
                }
            }
        }
        console.log('Adding annotations-updated listener')
        window.addEventListener('annotations-updated', handleAnnotationsUpdated)
        return () => window.removeEventListener('annotations-updated', handleAnnotationsUpdated)
    }, [channelId])

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
                <FontAwesomeIcon
                    icon={faArrowRotateRight}
                    title="Reload & reset sort"
                    aria-label="Reload"
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onClick={handleReload}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleReload(); } }}
                />
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
                                    <FontAwesomeIcon
                                        icon={faSort}
                                        title={`Sort by Start (current: ${sort.key==='startTimeMs'?sort.dir:'none'})`}
                                        aria-label="Sort Start"
                                        role="button"
                                        tabIndex={0}
                                        style={{ marginLeft:4, cursor:'pointer' }}
                                        onClick={() => handleHeaderSort('startTimeMs')}
                                        onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleHeaderSort('startTimeMs'); } }}
                                    />
                                </th>
                                <th>
                  <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('endTimeMs')}>
                    End (ms)
                  </span>
                                    <FontAwesomeIcon
                                        icon={faSort}
                                        title={`Sort by End (current: ${sort.key==='endTimeMs'?sort.dir:'none'})`}
                                        aria-label="Sort End"
                                        role="button"
                                        tabIndex={0}
                                        style={{ marginLeft:4, cursor:'pointer' }}
                                        onClick={() => handleHeaderSort('endTimeMs')}
                                        onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleHeaderSort('endTimeMs'); } }}
                                    />
                                </th>
                                <th>
                  <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('labelName')}>
                    Label
                  </span>
                                    <FontAwesomeIcon
                                        icon={faSort}
                                        title={`Sort by Label (current: ${sort.key==='labelName'?sort.dir:'none'})`}
                                        aria-label="Sort Label"
                                        role="button"
                                        tabIndex={0}
                                        style={{ marginLeft:4, cursor:'pointer' }}
                                        onClick={() => handleHeaderSort('labelName')}
                                        onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleHeaderSort('labelName'); } }}
                                    />
                                </th>
                                <th>
                  <span style={{cursor:'pointer'}} onClick={() => handleHeaderSort('note')}>
                    Note
                  </span>
                                    <FontAwesomeIcon
                                        icon={faSort}
                                        title={`Sort by Note (current: ${sort.key==='note'?sort.dir:'none'})`}
                                        aria-label="Sort Note"
                                        role="button"
                                        tabIndex={0}
                                        style={{ marginLeft:4, cursor:'pointer' }}
                                        onClick={() => handleHeaderSort('note')}
                                        onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleHeaderSort('note'); } }}
                                    />
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
                                    const id = row.annotationId ?? row.id
                                    const labelName = row.labelName || row.label?.name || 'Unknown'
                                    const note = row.note || ''
                                    const isSelected = id === selectedId
                                    return (
                                        <tr
                                            key={id}
                                            className={(() => {
                                                if (id !== selectedId) return ''
                                                const ln = (labelName || '').toLowerCase()
                                                return ln === 'unknown' ? 'highlight-unknown' : 'highlight'
                                            })()}
                                            onClick={(e) => handleRowClick(e, id)}
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(e, id) }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                {id === editId ? (
                                                    <input
                                                        type="number"
                                                        value={editFields.startTimeMs}
                                                        onChange={(e) => setEditFields(f => ({ ...f, startTimeMs: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
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
                                                        onClick={(e) => e.stopPropagation()}
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
                                                        list="label-options"
                                                        value={editFields.labelName}
                                                        onChange={(e) => setEditFields(f => ({ ...f, labelName: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '100%' }}
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
                                                        onClick={(e) => e.stopPropagation()}
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
                                                                    e.preventDefault()
                                                                    handleSaveLabelEdited(e, row)
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
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setEditId(null)
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    setEditId(null)
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
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                flashSelect(id)
                                                                setEditId(id)
                                                                setEditFields({
                                                                    labelName: labelName || '',
                                                                    note: note || '',
                                                                    startTimeMs: String(row.startTimeMs ?? ''),
                                                                    endTimeMs: String(row.endTimeMs ?? '')
                                                                })
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    flashSelect(id)
                                                                    setEditId(id)
                                                                    setEditFields({
                                                                        labelName: labelName || '',
                                                                        note: note || '',
                                                                        startTimeMs: String(row.startTimeMs ?? ''),
                                                                        endTimeMs: String(row.endTimeMs ?? '')
                                                                    })
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
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                handleDelete(e, id)
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault()
                                                                    handleDelete(e, id)
                                                                }
                                                            }}
                                                        />
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
                                    <FontAwesomeIcon
                                        icon={faPlus}
                                        onClick={handleCreate}
                                        role="button"
                                        tabIndex={0}
                                        title="Create"
                                        style={{ cursor: 'pointer' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleCreate()
                                            }
                                        }}
                                    />
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