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
    faArrowRotateRight,
    faChevronDown
} from "@fortawesome/free-solid-svg-icons"
import {
    fetchCreateAnnotation,
    fetchDeleteAnnotation,
    fetchGetAllLabels,
    fetchUpdateAnnotation
} from "../../api/index.js"

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
    const [focusedField, setFocusedField] = useState(null)

    const [allLabels, setAllLabels] = useState([])
    const [labelsLoading, setLabelsLoading] = useState(false)

    const [activeDropdown, setActiveDropdown] = useState(null)
    const dropdownRef = useRef(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
    
    // New color function based on label name
    const getBaseColor = (labelName) => {
        const name = (labelName || '').trim().toLowerCase();
        if (name === 'unknown') return '#4da3ff';
        const colors = [
            '#E41A1C', // red
            '#377EB8', // blue
            '#4DAF4A', // green
            '#984EA3', // purple
            '#FF7F00', // orange
            '#FFFF33', // yellow
            '#A65628', // brown
            '#F781BF', // pink
            '#999999', // gray

            '#66C2A5', // teal
            '#FC8D62', // coral
            '#8DA0CB', // soft blue
            '#E78AC3', // magenta
            '#A6D854', // lime
            '#FFD92F', // gold
            '#E5C494', // sand
            '#B3B3B3', // light gray

            '#1B9E77', // deep teal
            '#D95F02', // burnt orange
            '#7570B3', // indigo
            '#E7298A', // hot pink
            '#66A61E', // olive green
            '#E6AB02', // mustard
            '#A6761D'  // dark tan
        ];

        const simpleHash = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // keep 32bit
            }
            return Math.abs(hash);
        };
        return colors[simpleHash(name) % colors.length];
    }

    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    const isAnnotationRow = (row) => row && typeof row === 'object' && ('startTimeMs' in row) && ('endTimeMs' in row) && (('labelName' in row) || (row.label && row.label.name))
    const allAnnotationMode = Array.isArray(data) && data.length > 0 && data.every(isAnnotationRow)

    useEffect(() => {
        if (!Array.isArray(data) || data.length === 0) {
            if (selectedId !== null) setSelectedId(null)
            prevLengthRef.current = data ? data.length : 0
            prevRowsMapRef.current = new Map()
            return
        }
        const prevLength = prevLengthRef.current
        const firstRow = data[0]
        const lastRow = data[data.length - 1]
        const firstId = firstRow ? (firstRow.annotationId ?? firstRow.id) : null
        const lastId = lastRow ? (lastRow.annotationId ?? lastRow.id) : null
        const selectedStillExists = data.some(row => row && (row.annotationId ?? row.id) === selectedId)
        const currMap = new Map()
        for (const row of data) {
            if (!row) continue
            const id = row.annotationId ?? row.id
            const labelName = row.labelName || row.label?.name || ''
            const note = row.note || ''
            const sig = `${Number(row.startTimeMs) || 0}|${Number(row.endTimeMs) || 0}|${labelName}|${note}`
            currMap.set(id, sig)
        }
        if (prevLength == null) { if (firstId && selectedId !== firstId) setSelectedId(firstId) }
        else if (data.length > prevLength) { if (lastId && selectedId !== lastId) setSelectedId(lastId) }
        else {
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
            } else { if (firstId && selectedId !== firstId) setSelectedId(firstId) }
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

    useEffect(() => {
        if (selectedId) {
            const rowElement = document.querySelector(`tr[data-annotation-id="${selectedId}"]`)
            if (rowElement) { rowElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }) }
        }
    }, [selectedId])

    function handleRowClick(e, id) {
        if (e && e.target) {
            const t = e.target
            const tag = (t.tagName || '').toUpperCase()
            if (t.isContentEditable || ['INPUT','SELECT','TEXTAREA','BUTTON','A','LABEL'].includes(tag)) return
            if (t.closest('.icon-btn')) return
        }
        if (id === selectedId) return
        setSelectedId(id)
        try { const evt = new CustomEvent('annotation-select', { detail: { id } })
            window.dispatchEvent(evt)
        } catch (_) {}
    }

    const startEditing = (row, fieldToFocus = null) => {
        const id = row.annotationId ?? row.id
        setEditId(id)
        setEditFields({
            labelName: row.labelName || row.label?.name || '',
            note: row.note || '',
            startTimeMs: String(row.startTimeMs ?? ''),
            endTimeMs: String(row.endTimeMs ?? '')
        })
        setFocusedField(fieldToFocus)
        setActiveDropdown(null)
    }

    const handleDoubleClick = (e, row, field) => {
        e.preventDefault()
        e.stopPropagation()
        startEditing(row, field)
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => { document.removeEventListener("mousedown", handleClickOutside) }
    }, [])

    const toggleDropdown = async (e, id) => {
        e.preventDefault()
        e.stopPropagation()
        if (activeDropdown === id) {
            setActiveDropdown(null)
        } else {
            if(allLabels.length === 0) await handleReload()
            // Calculate position
            const wrapper = e.target.closest('.custom-select-wrapper')
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect()
                setDropdownPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                })
            }
            setActiveDropdown(id)
        }
    }

    const selectLabelFromDropdown = (name, isNewRow) => {
        if (isNewRow) {
            setNewRow(prev => ({ ...prev, labelName: name }))
        } else {
            setEditFields(prev => ({ ...prev, labelName: name }))
        }
        setActiveDropdown(null)
    }

    const dispatchAnnotationsUpdated = (nextAnnotations, updatedId) => {
        const evt = new CustomEvent('annotations-updated', {
            detail: {
                channelId,
                annotations: nextAnnotations,
                updatedId
            }
        })
        window.dispatchEvent(evt)
    }
    const handleCellUpdate = async (id, fields) => {
        if (!id || !fields || typeof fields !== 'object') return
        try {
            const updated = await fetchUpdateAnnotation(id, fields)
            if (!updated) return
            const next = (Array.isArray(data) ? data : []).map(row => row && (row.annotationId ?? row.id) === id ?
                { ...row, ...(updated?.labelName != null ? { labelName: updated.labelName } : {}), ...(updated?.note !== undefined ? {
                    note: updated.note } : {}), ...(updated?.startTimeMs != null ?
                        { startTimeMs: updated.startTimeMs } : {}), ...(updated?.endTimeMs != null ? { endTimeMs: updated.endTimeMs }
                        : {}
                    )
                } : row
            )
            if (fields.labelName) { const nm = (fields.labelName || '').trim()
                if (nm && !allLabels.some(l => (l.name || '').toLowerCase() === nm.toLowerCase())) {
                    setAllLabels(prev => [...prev, {
                        labelId: updated?.labelId ?? Date.now(),
                        name: nm,
                        createdAt: new Date().toISOString()
                    }])
                }
            }
            dispatchAnnotationsUpdated(next, id)
            if (editId === id) { setEditId(null)
                setEditFields({ labelName: '', note: '', startTimeMs: '', endTimeMs: '' })
                setFocusedField(null)
                setActiveDropdown(null) }
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
    const handleHeaderSort = (key) => { setSort(prev => { if (prev.key === key) { return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } } return { key, dir: 'asc' } }) }
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
        const safeData = data.filter(r => r !== null && r !== undefined)
        const ft = (filterText || '').trim().toLowerCase()
        const filtered = ft ? safeData.filter(row => {
            const label = (row.labelName || row.label?.name || '').toLowerCase()
            const note = (row.note || '').toLowerCase()
            return label.includes(ft) || note.includes(ft) }
        ) : safeData.slice()
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
        if (isNaN(sMs) || isNaN(eMs)) return
        try {
            const created = await fetchCreateAnnotation({
                channelId,
                startTime: sMs,
                endTime: eMs,
                name,
                note
            })
            if (!created || (created.annotationId == null && created.id == null)) return
            const createdId = created.annotationId ?? created.id
            const next = [...(Array.isArray(data) ? data : []), created]
            dispatchAnnotationsUpdated(next, createdId)
            if (name && !allLabels.some(l => (l.name || '').toLowerCase() === name.toLowerCase())) {
                setAllLabels(prev => [...prev, {
                    labelId: created?.labelId ?? Date.now(),
                    name,
                    createdAt: new Date().toISOString()
                }])
            }
            setNewRow({ startTimeMs: '', endTimeMs: '', labelName: '', note: '' })
            setActiveDropdown(null)
        } catch (err) {
            console.error('Create failed:', err)
        }
    }
    const handleEditButton = async (e, row) => {
        e.preventDefault()
        e.stopPropagation()
        if (editId === (row.annotationId ?? row.id)) {
            const id = row.annotationId ?? row.id
            const fields = {}
            const trimmedLabel = (editFields.labelName || '').trim()
            if (trimmedLabel !== (row.labelName || row.label?.name || '')) fields.labelName = trimmedLabel
            if ((editFields.note || '') !== (row.note || '')) fields.note = editFields.note || ''
            if (editFields.startTimeMs !== '' && editFields.startTimeMs !== row.startTimeMs) fields.startTimeMs = editFields.startTimeMs
            if (editFields.endTimeMs !== '' && editFields.endTimeMs !== row.endTimeMs) fields.endTimeMs = editFields.endTimeMs
            if (Object.keys(fields).length > 0) {
                await handleCellUpdate(id, fields)
            } else {
                setEditId(null)
                setFocusedField(null)
                setActiveDropdown(null)
            }
        } else {
            startEditing(row, 'labelName')
        }
    }

    const hasInputData =
        newRow.startTimeMs !== '' ||
        newRow.endTimeMs !== '' ||
        newRow.labelName.trim() !== '' ||
        newRow.note.trim() !== ''

    return (
        <div className="table-container">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="text" value={filterText} className="filter-input" onChange={(e) => setFilterText(e.target.value)} placeholder="Filter by label or note..." style={{ flex: 1, minWidth: 120 }} />
                <button className="icon-btn" onClick={handleReload} title="Reload & reset sort"><FontAwesomeIcon icon={faArrowRotateRight} /></button>
            </div>

            {(() => {
                const displayedRowsCount = allAnnotationMode ? (Array.isArray(filteredSortedData) ? filteredSortedData.length : 0) : (Array.isArray(data) ? data.length : 0)
                return (
                    <div className={'table-viewport'}>
                        <table>
                            <thead>
                            <tr>
                                <th onClick={() => handleHeaderSort('startTimeMs')} style={{cursor:'pointer'}}>Start (ms) <FontAwesomeIcon icon={faSort} className="ms-1"/></th>
                                <th onClick={() => handleHeaderSort('endTimeMs')} style={{cursor:'pointer'}}>End (ms) <FontAwesomeIcon icon={faSort} className="ms-1"/></th>
                                <th onClick={() => handleHeaderSort('labelName')} style={{cursor:'pointer'}}>Label <FontAwesomeIcon icon={faSort} className="ms-1"/></th>
                                <th onClick={() => handleHeaderSort('note')} style={{cursor:'pointer'}}>Note <FontAwesomeIcon icon={faSort} className="ms-1"/></th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {!Array.isArray(data) || data.length === 0 ? (
                                <tr>
                                    <td colSpan={5}
                                        style={{height: '15px', color: '#aaa'
                                    }}>
                                        (No data)
                                    </td>
                                </tr>
                            ) : (
                                filteredSortedData.map((row) => {
                                    if (!row) return null
                                    const id = row.annotationId ?? row.id
                                    const labelName = row.labelName || row.label?.name || 'Unknown'
                                    const note = row.note || ''
                                    const isEditing = id === editId
                                    return (
                                        <tr key={id}
                                            data-annotation-id={id}
                                            className={id === selectedId ? 'highlight' : ''}
                                            style={{
                                                ...(id === selectedId ? { backgroundColor: getBaseColor(labelName), color: 'white' } : {}),
                                                cursor: isEditing ? 'default' : 'pointer'
                                            }}
                                            onClick={e => {
                                                if (!isEditing) handleRowClick(e, id)
                                            }}
                                            tabIndex={0}
                                        >

                                            <td onDoubleClick={(e) =>
                                                handleDoubleClick(e, row, 'startTimeMs')}
                                            >
                                                {isEditing ? <input type="number" className="edit-input" value={editFields.startTimeMs ?? ''} onChange={(e) => setEditFields(f => ({ ...f, startTimeMs: e.target.value }))} autoFocus={focusedField === 'startTimeMs'} onClick={(e) => e.stopPropagation()} style={{ width: '100%' }} /> : row.startTimeMs}
                                            </td>
                                            <td onDoubleClick={(e) =>
                                                handleDoubleClick(e, row, 'endTimeMs')}
                                            >
                                                {isEditing ? <input type="number" className="edit-input" value={editFields.endTimeMs ?? ''} onChange={(e) => setEditFields(f => ({ ...f, endTimeMs: e.target.value }))} autoFocus={focusedField === 'endTimeMs'} onClick={(e) => e.stopPropagation()} style={{ width: '100%' }} /> : row.endTimeMs}
                                            </td>

                                            <td onDoubleClick={(e) => handleDoubleClick(e, row, 'labelName')}>
                                                {isEditing ? (
                                                    <div className="custom-select-wrapper">
                                                        <input
                                                            type="text"
                                                            className="edit-input custom-select-input"
                                                            value={editFields.labelName ?? ''}
                                                            onChange={(e) => setEditFields(f => ({ ...f, labelName: e.target.value }))}
                                                            autoFocus={focusedField === 'labelName'}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button className="custom-select-btn" onClick={(e) => toggleDropdown(e, id)} tabIndex={-1}>
                                                            <FontAwesomeIcon icon={faChevronDown} />
                                                        </button>
                                                    </div>
                                                ) : ( <span>{labelName}</span> )}
                                            </td>

                                            <td onDoubleClick={(e) => handleDoubleClick(e, row, 'note')}
                                                style={{
                                                    maxWidth: '200px',
                                                    whiteSpace: 'normal',
                                                    wordWrap: 'break-word',
                                                    wordBreak: 'break-word',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {isEditing ?
                                                    <input type="text"
                                                           className="edit-input"
                                                           value={editFields.note ?? ''}
                                                           onChange={e => setEditFields(f => ({ ...f, note: e.target.value }))}
                                                           autoFocus={focusedField === 'note'}
                                                           onClick={(e) => e.stopPropagation()}
                                                           onKeyDown={(e) => {
                                                               if(e.key === 'Enter') handleEditButton(e, row)
                                                           }}
                                                           style={{ width: '100%' }}
                                                    /> :
                                                    note
                                                }
                                            </td>
                                            <td className={`action-links`} onClick={(e) => e.stopPropagation()}>
                                                {isEditing ? (
                                                    <>
                                                        <button className="icon-btn editing"
                                                                onClick={(e) => handleEditButton(e, row)}
                                                                title="Save changes" style={{ marginRight: 8 }}
                                                        >
                                                            <FontAwesomeIcon icon={faFloppyDisk} />
                                                        </button>
                                                        <button className="icon-btn editing"
                                                                title="Cancel editing"
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setEditId(null)
                                                                    setFocusedField(null)
                                                                    setActiveDropdown(null)
                                                                }}>
                                                            <FontAwesomeIcon icon={faRectangleXmark} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="icon-btn editing"
                                                               title="Edit" style={{ marginRight: 8 }}
                                                               onClick={(e) => handleEditButton(e, row)}
                                                        >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                        </button>
                                                        <button className="icon-btn editing"
                                                                title="Delete"
                                                                onClick={(e) => handleDelete(e, id)}
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
                                <td><input type="number" placeholder="Start" className="input-label-detail" value={newRow.startTimeMs} onChange={(e) => setNewRow(r => ({ ...r, startTimeMs: e.target.value }))} style={{ width: '100%' }} /></td>
                                <td><input type="number" placeholder="End" className="input-label-detail" value={newRow.endTimeMs} onChange={(e) => setNewRow(r => ({ ...r, endTimeMs: e.target.value }))} style={{ width: '100%' }} /></td>
                                <td>
                                    <div className="custom-select-wrapper" ref={activeDropdown === 'NEW' ? null : null}>
                                        <input
                                            type="text"
                                            className="input-label-detail custom-select-input"
                                            placeholder={labelsLoading ? 'Loading...' : 'Label'}
                                            value={newRow.labelName}
                                            onChange={(e) => setNewRow(r => ({ ...r, labelName: e.target.value }))}
                                            style={{ width: '100%' }}
                                        />
                                        <button className="custom-select-btn" onClick={(e) => toggleDropdown(e, 'NEW')} tabIndex={-1}>
                                            <FontAwesomeIcon icon={faChevronDown} />
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <input type="text"
                                           placeholder="Note"
                                           className="input-label-detail"
                                           value={newRow.note}
                                           onChange={e => setNewRow(r => ({ ...r, note: e.target.value }))}
                                           style={{ width: '100%' }}
                                           onKeyDown={(e) => {
                                               if (e.key === 'Enter') handleCreate()
                                           }}
                                    />
                                </td>
                                <td>
                                    <button className="icon-btn"
                                            onClick={handleCreate}
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
            {activeDropdown && (
                <div ref={dropdownRef} className="custom-dropdown-list" style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 1000 }}>
                    {allLabels.length > 0 ? allLabels.map(l => (
                        <div key={l.labelId} className="dropdown-item" onClick={(e) => {
                            e.stopPropagation()
                            selectLabelFromDropdown(l.name, activeDropdown === 'NEW')
                        }}>
                            {l.name}
                        </div>
                    )) : <div className="dropdown-item" style={{color:'#999', cursor:'default'}}>No labels found</div>}
                </div>
            )}
        </div>
    )
}

export default LabelTable