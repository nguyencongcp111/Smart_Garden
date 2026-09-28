// src/components/NotesList.jsx

import React from 'react';
import { FileText, X } from 'lucide-react';

const NotesList = ({ notes, onDelete }) => {
  const handleDelete = (id) => {
    if (confirm('Bạn có chắc muốn xóa?')) {
      onDelete('notes', id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Ghi chú ({notes.length})
        </h3>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.map(note => (
          <div key={note.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-start">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">{note.date}</div>
              <div className="text-gray-800 whitespace-pre-wrap">{note.content}</div>
            </div>
            <button
              onClick={() => handleDelete(note.id)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Chưa có ghi chú. Tải lên file .txt để thêm ghi chú.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesList;