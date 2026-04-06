import { useEffect, useState, useRef, useMemo } from 'react'

import './LabelTable.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faFloppyDisk,
    faPencil,
    faPlus,
    faRectangleXmark,
    faTrash,
    faSort,
    faChevronDown
} from "@fortawesome/free-solid-svg-icons"
import {
    fetchCreateAnnotation,
    fetchDeleteAnnotation,
    fetchGetAllLabels,
    fetchUpdateAnnotation
} from "../../api/index.js"
import {getBaseColor} from "../../hooks/useLabelColor.js";

const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
    str = str.replace(/[èéẹẻẽêềếệểễ]/g, "e");
    str = str.replace(/[ìíịỉĩ]/g, "i");
    str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
    str = str.replace(/[ùúụủũưừứựửữ]/g, "u");
    str = str.replace(/[ỳýỵỷỹ]/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, "A");
    str = str.replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, "E");
    str = str.replace(/[ÌÍỊỈĨ]/g, "I");
    str = str.replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, "O");
    str = str.replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, "U");
    str = str.replace(/[ỲÝỴỶỸ]/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "");
    str = str.replace(/[\u02C6\u0306\u031B]/g, "");
    return str;
}

const LabelTable = ({ channelId, annotations, sessionStatus }) => {
    const [selectedId, setSelectedId] = useState(null)
    const selectedIdRef = useRef(selectedId)
    const prevLengthRef = useRef(null)
    const prevRowsMapRef = useRef(new Map())
    const [filterText, setFilterText] = useState('')
    const [labelFilterText, setLabelFilterText] = useState('')
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
    const [highlightedIndex, setHighlightedIndex] = useState(-1)

    const showRevisionCheckbox = ['WAIT_FOR_DOUBLE_CHECK', 'DOCTOR_COMPLETED', 'NEEDS_REVISION'].includes(sessionStatus);

    const overlapGroupColors = ['#FF6B6B']

    const computeOverlapGroups = (arr) => {
        const map = new Map()
        if (!Array.isArray(arr) || arr.length === 0) return map
        const items = arr.filter(Boolean).map(a => ({
            id: a.annotationId ?? a.id,
            start: Number(a.startTimeMs) || 0,
            end: Number(a.endTimeMs) || 0,
            labelName: a.labelName || a.label?.name || ''
        })).sort((a, b) => a.start - b.start)
        let groups = []
        let current = null
        for (const it of items) {
            if (!current) {
                current = { id: groups.length, end: it.end, items: [it] }
                groups.push(current)
                continue
            }
            if (it.start < current.end) {
                current.items.push(it)
                if (it.end > current.end) current.end = it.end
            } else {
                current = { id: groups.length, end: it.end, items: [it] }
                groups.push(current)
            }
        }
        for (const g of groups) {
            if (g.items.length > 1) {
                for (const it of g.items) map.set(it.id, g.id)
            }
        }
        return map
    }

    const overlapGroupMap = useMemo(() => computeOverlapGroups(annotations), [annotations])

    useEffect(() => {
        selectedIdRef.current = selectedId
    }, [selectedId])

    useEffect(() => {
        if (!Array.isArray(annotations) || annotations.length === 0) {
            if (selectedId !== null) setSelectedId(null)
            prevLengthRef.current = annotations ? annotations.length : 0
            prevRowsMapRef.current = new Map()
            return
        }
        const prevLength = prevLengthRef.current
        const firstRow = annotations[0]
        const lastRow = annotations[annotations.length - 1]
        const firstId = firstRow ? (firstRow.annotationId ?? firstRow.id) : null
        const lastId = lastRow ? (lastRow.annotationId ?? lastRow.id) : null
        const selectedStillExists = annotations.some(row => row && (row.annotationId ?? row.id) === selectedId)
        const currMap = new Map()
        for (const row of annotations) {
            if (!row) continue
            const id = row.annotationId ?? row.id
            const labelName = row.labelName || row.label?.name || ''
            const note = row.note || ''
            const needsRevision = row.needsRevision ? '1' : '0'
            const sig = `${Number(row.startTimeMs) || 0}|${Number(row.endTimeMs) || 0}|${labelName}|${note}|${needsRevision}`
            currMap.set(id, sig)
        }
        if (prevLength == null) { if (firstId && selectedId !== firstId) setSelectedId(firstId) }
        else if (annotations.length > prevLength) {
            if (lastId && selectedId !== lastId) setSelectedId(lastId)
        }
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
            } else {
                if (firstId && selectedId !== firstId) setSelectedId(firstId)
            }
        }
        prevLengthRef.current = annotations.length
        prevRowsMapRef.current = currMap
    }, [annotations])

    useEffect(() => {
        const handleAnnotationSelect = (e) => {
            const id = e?.detail?.id
            if (id == null) return
            if (Array.isArray(annotations)) {
                const exists = annotations.some(row => row && (row.annotationId ?? row.id) === id)
                if (!exists) return
            }
            setSelectedId(id)
        }
        window.addEventListener('annotation-select', handleAnnotationSelect)
        return () => window.removeEventListener('annotation-select', handleAnnotationSelect)
    }, [annotations])

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
        if (id !== selectedId) {
            setSelectedId(id)
        }
        try {
            const evt = new CustomEvent('annotation-select', { detail: { id } })
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
        e.stopPropagation()
        startEditing(row, field)
        requestAnimationFrame(() => {
            const el = document.activeElement
            if (!el) return
            const tag = (el.tagName || '').toUpperCase()
            if (tag !== 'INPUT' && tag !== 'TEXTAREA') return
            if (typeof el.select === 'function') {
                try { el.select() } catch (_) {}
            }
        })
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

    const handleLabelInputChange = (e, id) => {
        const val = e.target.value;
        if (id === 'NEW') {
            setNewRow(prev => ({ ...prev, labelName: val }))
        } else {
            setEditFields(prev => ({ ...prev, labelName: val }))
        }

        setHighlightedIndex(-1)

        if (activeDropdown !== id) {
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
        setHighlightedIndex(-1)
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
            const next = (Array.isArray(annotations) ? annotations : []).map(row => row && (row.annotationId ?? row.id) === id ?
                { ...row,
                    ...(updated?.labelName != null ? { labelName: updated.labelName } : {}),
                    ...(updated?.note !== undefined ? { note: updated.note } : {}),
                    ...(updated?.startTimeMs != null ? { startTimeMs: updated.startTimeMs } : {}),
                    ...(updated?.endTimeMs != null ? { endTimeMs: updated.endTimeMs } : {}),
                    ...(updated?.needsRevision != null ? { needsRevision: updated.needsRevision } : {})
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

    const handleToggleRevision = async (e, id, currentVal) => {
        e.preventDefault()
        e.stopPropagation()
        await handleCellUpdate(id, { needsRevision: !currentVal })
    }

    const handleDelete = async (e, id) => {
        e.preventDefault()
        e.stopPropagation()
        if (!id) return
        const ok = window.confirm('Delete this annotation?')
        if (!ok) return
        try {
            const success = await fetchDeleteAnnotation(id)
            if (!success) {
                console.error('Delete failed')
                return
            }
            const next = (Array.isArray(annotations) ? annotations : []).filter(row => row && (row.annotationId ?? row.id) !== id)
            dispatchAnnotationsUpdated(next, null)
        } catch (err) {
            console.error('Failed to delete annotation:', err)
        }
    }
    const handleHeaderSort = (key) => {
        setSort(prev => {
            if (prev.key === key) {
                return {
                    key,
                    dir: prev.dir === 'asc' ? 'desc' : 'asc'
                }
            }
            return { key, dir: 'asc' }
        })
    }

    const handleReload = async () => {
        setSort({ key: 'startTimeMs', dir: 'asc' })
        setFilterText('')
        setLabelFilterText('')
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

    const filteredSortedData = useMemo(() => {
        if (!Array.isArray(annotations)) return annotations
        const safeData = annotations.filter(r => r !== null && r !== undefined)
        const ft = removeVietnameseTones((filterText || '').trim().toLowerCase())
        let filtered = ft ? safeData.filter(row => {
            const label = removeVietnameseTones((row.labelName || row.label?.name || '').toLowerCase())
            const note = removeVietnameseTones((row.note || '').toLowerCase())
            return label.includes(ft) || note.includes(ft) }
        ) : safeData.slice()

        const labelFilter = removeVietnameseTones((labelFilterText || '').trim().toLowerCase())
        if (labelFilter) {
            filtered = filtered.filter(row => {
                const label = removeVietnameseTones((row.labelName || row.label?.name || '').toLowerCase())
                return label.includes(labelFilter)
            })
        }

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
    }, [annotations, filterText, labelFilterText, sort])

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
            const next = [...(Array.isArray(annotations) ? annotations : []), created]
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

    const currentInputText = activeDropdown === 'NEW' ? newRow.labelName : editFields.labelName;
    const searchTxt = removeVietnameseTones((currentInputText || '').trim().toLowerCase());
    const displayLabels = searchTxt
        ? allLabels.filter(l => removeVietnameseTones((l.name || '').toLowerCase()).includes(searchTxt))
        : allLabels;

    const handleLabelKeyDown = (e, id) => {
        if (!activeDropdown) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, displayLabels.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < displayLabels.length) {
                selectLabelFromDropdown(displayLabels[highlightedIndex].name, id === 'NEW');
            } else if (displayLabels.length === 1 && searchTxt.length > 0) {
                selectLabelFromDropdown(displayLabels[0].name, id === 'NEW');
            } else {
                setActiveDropdown(null);
            }
        } else if (e.key === 'Escape') {
            setActiveDropdown(null);
        }
    }

    const hasInputData =
        newRow.startTimeMs.trim() !== '' &&
        newRow.endTimeMs.trim() !== '' &&
        newRow.labelName.trim() !== ''

    return (
        <div className="table-container">

            {(() => {
                return (
                    <div className={'table-viewport'}>
                        <table>
                            <thead>
                            <tr>
                                <th onClick={() => handleHeaderSort('startTimeMs')} style={{cursor:'pointer', verticalAlign: 'top'}}>
                                    Start (ms) <FontAwesomeIcon icon={faSort} className="ms-1"/>
                                </th>
                                <th onClick={() => handleHeaderSort('endTimeMs')} style={{cursor:'pointer', verticalAlign: 'top'}}>
                                    End (ms) <FontAwesomeIcon icon={faSort} className="ms-1"/>
                                </th>

                                <th style={{verticalAlign: 'top'}}>
                                    <div onClick={() => handleHeaderSort('labelName')} style={{cursor:'pointer'}}>
                                        Label
                                    </div>
                                    <input
                                        className="input-label-detail custom-select-input"
                                        type="text"
                                        placeholder="Type to search..."
                                        value={labelFilterText}
                                        onChange={(e) => setLabelFilterText(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '100%', marginTop: '6px' }}
                                    />
                                </th>

                                <th onClick={() => handleHeaderSort('note')} style={{cursor:'pointer', verticalAlign: 'top'}}>
                                    Note
                                </th>
                                <th style={{verticalAlign: 'top'}}>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {!Array.isArray(annotations) || annotations.length === 0 ? (
                                <tr>
                                    <td colSpan={5}
                                        style={{height: '15px', color: '#aaa'
                                        }}>
                                        (No annotations)
                                    </td>
                                </tr>
                            ) : (
                                filteredSortedData.map((row) => {
                                    if (!row) return null
                                    const id = row.annotationId ?? row.id
                                    const labelName = row.labelName || row.label?.name || 'Unknown'
                                    const note = row.note || ''
                                    const needsRevision = row.needsRevision || false
                                    const isEditing = id === editId
                                    const groupId = overlapGroupMap.get(id)
                                    const borderColor = groupId != null ? overlapGroupColors[groupId % overlapGroupColors.length] : undefined
                                    const revisionStyle = needsRevision ? { backgroundColor: '#ffe6e6', borderLeft: '4px solid #ff4444' } : {}

                                    return (
                                        <tr key={id}
                                            data-annotation-id={id}
                                            className={id === selectedId ? 'highlight' : ''}
                                            style={{
                                                ...(id === selectedId ? { backgroundColor: getBaseColor(labelName), color: 'white' } : revisionStyle),
                                                cursor: isEditing ? 'default' : 'pointer',
                                                ...(needsRevision && !id === selectedId ? { borderLeft: '4px solid #ff4444' } : { borderLeft: borderColor ? `4px solid ${borderColor}` : undefined })
                                            }}
                                            onClick={e => {
                                                if (!isEditing) handleRowClick(e, id)
                                            }}
                                            tabIndex={0}
                                        >

                                            <td onDoubleClick={(e) =>
                                                handleDoubleClick(e, row, 'startTimeMs')}
                                                style={{ borderLeft: needsRevision ? 'none' : (borderColor ? `4px solid ${borderColor}` : undefined) }}
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
                                                            onChange={(e) => handleLabelInputChange(e, id)}
                                                            onKeyDown={(e) => handleLabelKeyDown(e, id)}
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
                                                                title="Delete" style={{ marginRight: 8 }}
                                                                onClick={(e) => handleDelete(e, id)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>

                                                        {showRevisionCheckbox && (
                                                            <label title={sessionStatus === 'NEEDS_REVISION' ? "Uncheck when resolved" : "Request Revision"}
                                                                   style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!needsRevision}
                                                                    onChange={(e) => handleToggleRevision(e, id, needsRevision)}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ff4444' }}
                                                                />
                                                            </label>
                                                        )}
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
                                            onChange={(e) => handleLabelInputChange(e, 'NEW')}
                                            onKeyDown={(e) => handleLabelKeyDown(e, 'NEW')}
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

            {activeDropdown && (() => {
                return (
                    <div ref={dropdownRef} className="custom-dropdown-list" style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 1000 }}>
                        {displayLabels.length > 0 ? displayLabels.map((l, index) => (
                                <div key={l.labelId}
                                     className="dropdown-item"
                                     onClick={(e) => {
                                         e.stopPropagation()
                                         selectLabelFromDropdown(l.name, activeDropdown === 'NEW')
                                     }}
                                     style={index === highlightedIndex ? { backgroundColor: '#e6f7ff', color: '#1890ff' } : {}}
                                >
                                    {l.name}
                                </div>
                            )) :
                            <div className="dropdown-item" style={{color:'#999', cursor:'default'}}>
                                No labels match
                            </div>
                        }
                    </div>
                );
            })()}
        </div>
    )
}

export default LabelTable