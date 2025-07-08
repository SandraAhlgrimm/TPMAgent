'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const ANIMATION_DURATION = 500; // ms
const DISPLAY_DURATION = 5000; // ms

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now() + Math.random(); // Simple unique ID
    const newToast: Toast = { id, message, type, isVisible: false };
    
    setToasts(prev => [...prev, newToast]);
    
    // Trigger fade in
    setTimeout(() => {
      setToasts(prev => prev.map(toast => 
        toast.id === id ? { ...toast, isVisible: true } : toast
      ));
    }, 10); // Small delay to ensure DOM is updated
    
    // Trigger fade out
    setTimeout(() => {
      setToasts(prev => prev.map(toast => 
        toast.id === id ? { ...toast, isVisible: false } : toast
      ));
    }, DISPLAY_DURATION - ANIMATION_DURATION);
    
    // Remove from array
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, DISPLAY_DURATION);
  }, []);

  const removeToast = useCallback((id: number) => {
    // Trigger fade out
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isVisible: false } : toast
    ));
    
    // Remove from array after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, ANIMATION_DURATION);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg text-white transition-all ease-in-out ${
            toast.isVisible 
              ? 'opacity-100 transform translate-x-0' 
              : 'opacity-0 transform translate-x-full'
          } ${
            toast.type === 'success' 
              ? 'bg-green-500' 
              : toast.type === 'error' 
              ? 'bg-red-500' 
              : 'bg-blue-500'
          }`}
          style={{ 
            transitionDuration: `${ANIMATION_DURATION}ms` 
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-2 text-white hover:text-gray-200 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
