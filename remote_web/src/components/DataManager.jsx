// src/components/DataManager.jsx

import React, { useRef } from 'react';
import { X, Upload, Download, FileText } from 'lucide-react';
import CropsList from './CropsList';
import ActivitiesList from './ActivitiesList';
import NotesList from './NotesList';

const DataManager = ({ 
  isOpen, 
  onClose, 
  farmData,
  onFileUpload,
  onDownloadJSON,
  onDownloadCSV,
  onAddCrop,
  onAddActivity,
  onDeleteItem,
  onClearAll
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleClearAll = () => {
    if (confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác!')) {
      onClearAll();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Dữ liệu Nông trại</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Upload/Download Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => fileInputRef.current.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Upload className="w-5 h-5" />
          Tải lên file
        </button>
        <button
          onClick={onDownloadJSON}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="w-5 h-5" />
          Tải JSON
        </button>
        <button
          onClick={onDownloadCSV}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <FileText className="w-5 h-5" />
          Tải CSV
        </button>
        <button
          onClick={handleClearAll}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <X className="w-5 h-5" />
          Xóa tất cả
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Crops Section */}
      <CropsList 
        crops={farmData.crops}
        onAdd={onAddCrop}
        onDelete={onDeleteItem}
      />

      {/* Activities Section */}
      <ActivitiesList 
        activities={farmData.activities}
        onAdd={onAddActivity}
        onDelete={onDeleteItem}
      />

      {/* Notes Section */}
      <NotesList 
        notes={farmData.notes}
        onDelete={onDeleteItem}
      />

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">📖 Hướng dẫn sử dụng:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Tải lên JSON:</strong> File dữ liệu đã xuất trước đó</li>
          <li>• <strong>Tải lên CSV:</strong> File Excel với cột: activity, date, weather</li>
          <li>• <strong>Tải lên TXT:</strong> Ghi chú văn bản thông thường</li>
          <li>• <strong>Tải JSON:</strong> Xuất toàn bộ dữ liệu ra file JSON</li>
          <li>• <strong>Tải CSV:</strong> Xuất nhật ký hoạt động ra Excel</li>
        </ul>
      </div>
    </div>
  );
};

export default DataManager;