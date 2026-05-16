'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full p-8 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-colors duration-300"
    >
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex flex-col items-center justify-center"
        >
          <svg
            className="w-16 h-16 text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z"
            ></path>
          </svg>
          <p className="text-lg font-semibold text-gray-300">
            {file ? file.name : 'Drag & drop your CSV file here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse
          </p>
        </motion.div>
      </label>
    </div>
  );
}
