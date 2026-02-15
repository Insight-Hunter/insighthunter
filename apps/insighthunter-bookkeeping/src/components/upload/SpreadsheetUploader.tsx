// src/components/upload/SpreadsheetUploader.tsx
import { useState, useRef } from 'react';
import { FiUpload, FiFile, FiCheck } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import './SpreadsheetUploader.css';

interface SpreadsheetUploaderProps {
  companyId: string;
  onUploadComplete: (data: any[]) => void;
}

export default function SpreadsheetUploader({
  companyId,
  onUploadComplete,
}: SpreadsheetUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Parse and preview
    if (selectedFile.name.endsWith('.csv')) {
      parseCSV(selectedFile);
    } else if (
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls')
    ) {
      parseExcel(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
      },
    });
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      setPreview(jsonData.slice(0, 5));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // Upload to R2
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);

      const response = await fetch('/api/upload/spreadsheet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Parse full file
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            onUploadComplete(results.data);
          },
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          onUploadComplete(jsonData);
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="spreadsheet-uploader">
      <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
        <FiUpload className="upload-icon" />
        <h3>Upload Spreadsheet</h3>
        <p>CSV, XLS, or XLSX files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {file && (
        <div className="file-info">
          <FiFile />
          <span>{file.name}</span>
          <FiCheck className="check-icon" />
        </div>
      )}

      {preview.length > 0 && (
        <div className="preview-section">
          <h4>Preview (first 5 rows)</h4>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j}>{val?.toString() || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Import Transactions'}
          </button>
        </div>
      )}
    </div>
  );
}
