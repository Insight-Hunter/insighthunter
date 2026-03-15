// src/components/upload/SpreadsheetUploader.tsx
import { useState, useRef } from 'react';
import { FiUpload, FiFile, FiCheck } from 'react-icons/fi';
import * as ExcelJS from 'exceljs';
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

  const parseExcelAndGetData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            return resolve([]);
          }
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];
          const jsonData: any[] = [];
          const headers: string[] = [];
          
          const headerRow = worksheet.getRow(1);
          headerRow.eachCell({ includeEmpty: true }, (cell) => {
              headers.push(cell.value ? cell.value.toString() : `column_${cell.col}`);
          });

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              const rowData: { [key: string]: any } = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber - 1];
                rowData[header] = cell.value;
              });
              jsonData.push(rowData);
            }
          });
          resolve(jsonData);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    if (selectedFile.name.endsWith('.csv')) {
      parseCSV(selectedFile);
    } else if (
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls')
    ) {
        try {
            const jsonData = await parseExcelAndGetData(selectedFile);
            setPreview(jsonData.slice(0, 5));
        } catch (error) {
            alert('Failed to parse Excel file.');
        }
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

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
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

      await response.json();

      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            onUploadComplete(results.data);
          },
        });
      } else {
        const jsonData = await parseExcelAndGetData(file);
        onUploadComplete(jsonData);
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
