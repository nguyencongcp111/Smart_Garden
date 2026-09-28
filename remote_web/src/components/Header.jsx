// src/components/Header.jsx

import React, { useState } from 'react';
import { Sprout, Folder } from 'lucide-react';

const Header = ({ onSearch, onToggleDataManager, loading }) => {
  const [city, setCity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(city);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sprout className="w-10 h-10 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Thời tiết Nông nghiệp</h1>
            <p className="text-gray-600">Dự báo chuyên biệt cho canh tác</p>
          </div>
        </div>
        <button
          onClick={onToggleDataManager}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Folder className="w-5 h-5" />
          Quản lý dữ liệu
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Nhập tên thành phố (VD: Hanoi, Ho Chi Minh, Manila, Bangkok...)"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>
    </div>
  );
};

export default Header;