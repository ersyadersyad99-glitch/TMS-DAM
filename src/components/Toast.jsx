import React from 'react';
import { useToastStore } from '../store';

const toastIcons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{toastIcons[t.type] || 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="btn-ghost"
            style={{ padding: '0 4px', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
