import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin, {
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export function useSocket(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();

    const entries = Object.entries(handlersRef.current);
    entries.forEach(([event, handler]) => {
      socket.on(event, (...args) => handlersRef.current[event]?.(...args));
    });

    return () => {
      entries.forEach(([event]) => socket.off(event));
    };
  }, []);
}
