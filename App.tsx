import React, { useEffect, useState } from 'react';
import { Plus, Loader2, Wifi, WifiOff, AlertTriangle, Database } from 'lucide-react';
import { peerbitService, Task, IDatabase } from './services/db';
import { ITask, TaskStatus } from './types';
import Sidebar from './components/Sidebar';
import { TaskItem } from './components/TaskItem';

const createSearchRequest = (query: any) => ({ query });

export default function App() {
  const [db, setDb] = useState<IDatabase | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(TaskStatus.INBOX);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { db: database } = await peerbitService.init();
        if (!mounted) return;
        
        setDb(database);
        
        if (database.tasks.events) {
            database.tasks.events.addEventListener('change', () => {
                if (mounted) loadTasks(database);
            });
        }
        await loadTasks(database);
      } catch (err: any) {
        console.error("Critical DB Init Error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    return () => { mounted = false; };
  }, []);

  const loadTasks = async (database: IDatabase) => {
    setIsSyncing(true);
    try {
      const results = await database.tasks.index.search(createSearchRequest([]));
      
      const mappedTasks: ITask[] = results.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: Number(t.createdAt),
        tags: t.tags
      }));

      mappedTasks.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(mappedTasks);
    } catch (e) {
      console.error("Error searching DB:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !db) return;

    const task = new Task(newTaskTitle, TaskStatus.INBOX);
    
    // Optimistic UI update
    const optimisticTask: ITask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: Number(task.createdAt),
        tags: task.tags
    };
    setTasks(prev => [optimisticTask, ...prev]);
    setNewTaskTitle('');

    try {
        await db.tasks.put(task);
        // Refresh to get canonical state
        await loadTasks(db);
    } catch (e) {
        console.error("Failed to save task", e);
    }
  };

  const handleUpdateTask = async (updatedTask: ITask) => {
    if (!db) return;

    const taskRecord = new Task(updatedTask.title, updatedTask.status);
    taskRecord.id = updatedTask.id;
    taskRecord.description = updatedTask.description;
    taskRecord.createdAt = BigInt(updatedTask.createdAt);
    taskRecord.tags = updatedTask.tags;

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    try {
        await db.tasks.put(taskRecord);
        await loadTasks(db);
    } catch (e) {
        console.error("Failed to update task", e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!db) return;
    
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
        await db.tasks.del(id);
        await loadTasks(db);
    } catch (e) {
        console.error("Failed to delete task", e);
    }
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t => {
    if (filter === TaskStatus.DONE) return t.status === TaskStatus.DONE;
    if (filter === TaskStatus.TRASH) return t.status === TaskStatus.TRASH;
    if (t.status === TaskStatus.DONE || t.status === TaskStatus.TRASH) return false;
    return t.status === filter;
  });

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
        <Loader2 className="animate-spin" size={48} />
        <p className="font-medium">Initializing GTD Engine...</p>
        <p className="text-xs text-slate-300">Connecting to P2P network or Local Storage</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
        currentFilter={filter} 
        setFilter={setFilter} 
        dbAddress={db?.address || null}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {filter.replace('_', ' ')}
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium">
            {db?.type === 'peerbit' ? (
                isSyncing ? (
                    <span className="flex items-center gap-1 text-blue-500">
                        <Loader2 size={12} className="animate-spin" /> Syncing P2P...
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-green-600">
                        <Wifi size={12} /> P2P Connected
                    </span>
                )
            ) : (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100" title="Running in Local Mode due to network restrictions">
                    <Database size={12} /> Local Mode
                </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {filter !== TaskStatus.TRASH && filter !== TaskStatus.DONE && (
              <form onSubmit={handleAddTask} className="relative">
                <input
                  type="text"
                  placeholder="Capture a new thought..."
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-sm border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg placeholder:text-slate-400"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Plus size={24} />
                </div>
              </form>
            )}

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-300 mb-4">
                    <CheckCircleIcon filter={filter} />
                  </div>
                  <p className="text-slate-500 font-medium">No tasks in {filter}</p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onUpdate={handleUpdateTask} 
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const CheckCircleIcon = ({ filter }: { filter: string }) => {
    if (filter === TaskStatus.TRASH) return <Loader2 size={32} className="opacity-0" />;
    return <div className="w-8 h-8 rounded-full border-4 border-current opacity-20" />;
}