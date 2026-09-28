// src/components/CropsList.jsx

import React from 'react';
import { Sprout, X } from 'lucide-react';

const CropsList = ({ crops, onAdd, onDelete }) => {
  const handleAdd = () => {
    const cropName = prompt('Nhập tên cây trồng:');
    if (cropName) {
      onAdd(cropName);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc muốn xóa?')) {
      onDelete('crops', id);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sprout className="w-5 h-5 text-green-600" />
          Cây trồng ({crops.length})
        </h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
        >
          + Thêm cây
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {crops.map(crop => (
          <div key={crop.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-gray-800">{crop.name}</div>
              <button
                onClick={() => handleDelete(crop.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600">Ngày trồng: {crop.plantDate}</div>
            <div className="text-sm text-gray-600">Trạng thái: {crop.status}</div>
          </div>
        ))}
        {crops.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-4">
            Chưa có cây trồng nào. Click "Thêm cây" để bắt đầu.
          </div>
        )}
      </div>
    </div>
  );
};

export default CropsList;