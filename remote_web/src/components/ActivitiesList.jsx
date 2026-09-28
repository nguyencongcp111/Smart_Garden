// src/components/ActivitiesList.jsx

import React from 'react';
import { Calendar, X } from 'lucide-react';

const ActivitiesList = ({ activities, onAdd, onDelete }) => {
  const handleAdd = () => {
    const activity = prompt('Nhập hoạt động (VD: Phun thuốc, Bón phân, Tưới nước):');
    if (activity) {
      onAdd(activity);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc muốn xóa?')) {
      onDelete('activities', id);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Nhật ký hoạt động ({activities.length})
        </h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Thêm hoạt động
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.map(activity => (
          <div key={activity.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-start">
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{activity.activity}</div>
              <div className="text-sm text-gray-600">{activity.date}</div>
              {activity.weather && (
                <div className="text-xs text-blue-600 mt-1">Thời tiết: {activity.weather}</div>
              )}
            </div>
            <button
              onClick={() => handleDelete(activity.id)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Chưa có hoạt động nào. Click "Thêm hoạt động" để ghi chép.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesList;