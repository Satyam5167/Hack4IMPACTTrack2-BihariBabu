import { useEffect, useRef } from 'react';

export default function Toast({ toast }) {
  return (
    <div className={`toast${toast.show ? ' show' : ''}`}>
      <span style={{ fontSize: '14px' }}>{toast.icon}</span>
      <span>{toast.msg}</span>
    </div>
  );
}
