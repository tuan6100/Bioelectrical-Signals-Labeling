import React, { useRef } from 'react';

export default function TopControl ({
  startPosition,
  onStartPositionChange,
  onSetup,
  onUpload,
  onDownload
}) {
  const fileInputRef = useRef(null);

  function handleUploadClick() {
    fileInputRef.current && fileInputRef.current.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      if (typeof onUpload === 'function') {
        onUpload(file);
      }
    } finally {
      e.target.value = null;
    }
  }

  return (
    <div className="top-controls">
      <div>
        <label>Thiết lập gán nhãn từ vị trí thứ: </label>
        <input
          type="number"
          value={startPosition}
          onChange={(e) => onStartPositionChange(e.target.value)}
          min="1"
          style={{width: '50px'}}
        />
        <button onClick={onSetup}>Thiết lập</button>
      </div>
      <div>
        <button onClick={handleUploadClick}>Upload tập dữ liệu gán nhãn - TXT</button>
        <button onClick={onDownload}>Tải xuống dữ liệu đã dán nhãn hiện tại</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
