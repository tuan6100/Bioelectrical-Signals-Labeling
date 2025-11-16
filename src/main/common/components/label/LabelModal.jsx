import React, { useState } from 'react';

/**
 * props:
 *  selection: {startMs:number,endMs:number}|null
 *  onCancel: fn
 *  onConfirm: fn({name,note})
 */
export default function LabelModal({ selection, onCancel, onConfirm }) {
    if (!selection) return null;
    const [name, setName] = useState('');
    const [note, setNote] = useState('');

    return (
        <div className="label-modal-backdrop">
            <div className="label-modal">
                <h3>Create Label</h3>
                <p>Start: {Math.round(selection.startMs)} ms<br/>End: {Math.round(selection.endMs)} ms</p>
                <input
                    placeholder="Label name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <textarea
                    placeholder="Note (optional)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                />
                <div className="modal-actions">
                    <button onClick={onCancel}>Cancel</button>
                    <button disabled={!name.trim()} onClick={() => onConfirm({ name: name.trim(), note: note.trim() || null })}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}