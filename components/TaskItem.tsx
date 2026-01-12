import React, { useState } from 'react';
import { ITask, TaskStatus } from '../types';
import { Check, Trash, ArrowRight, RotateCcw, X, MoreHorizontal } from 'lucide-react';

interface TaskItemProps {
  task: ITask;
  onUpdate: (task: ITask) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleStatusChange = (newStatus: string) => {
    onUpdate({ ...task, status: newStatus });
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate({ ...task, title: editTitle });
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  if (task.status === TaskStatus.TRASH) {
    return (
      <div className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg opacity-60 hover:opacity-100 transition-all">
        <span className="text-slate-500 line-through decoration-slate-400">{task.title}</span>
        <div className="flex gap-2">
          <button 
            onClick={() => handleStatusChange(TaskStatus.INBOX)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Restore"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete Permanently"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center p-4 gap-3">
        {/* Checkbox / Status Toggle */}
        <button
          onClick={() => handleStatusChange(task.status === TaskStatus.DONE ? TaskStatus.INBOX : TaskStatus.DONE)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.status === TaskStatus.DONE 
              ? 'bg-green-500 border-green-500' 
              : 'border-slate-300 hover:border-blue-500'
          }`}
        >
          {task.status === TaskStatus.DONE && <Check size={12} className="text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              className="w-full text-sm font-medium text-slate-900 border-b-2 border-blue-500 outline-none pb-1"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className={`text-sm font-medium cursor-text truncate ${
                task.status === TaskStatus.DONE ? 'text-slate-400 line-through' : 'text-slate-700'
              }`}
            >
              {task.title}
            </div>
          )}
        </div>

        {/* Action Badges/Buttons */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.status !== TaskStatus.DONE && (
            <>
              {task.status === TaskStatus.INBOX && (
                <button
                  onClick={() => handleStatusChange(TaskStatus.NEXT)}
                  className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded"
                >
                  Do Next
                </button>
              )}
               {task.status === TaskStatus.NEXT && (
                <button
                  onClick={() => handleStatusChange(TaskStatus.WAITING)}
                  className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded"
                >
                  Wait
                </button>
              )}
            </>
          )}
          
          <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

          <button
            onClick={() => handleStatusChange(TaskStatus.TRASH)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
            title="Move to Trash"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
