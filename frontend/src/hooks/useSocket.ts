'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAssignmentStore } from '@/store/assignmentStore';
import { JobProgress } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { setJobProgress, updateAssignmentStatus } = useAssignmentStore();

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
    }
    socketRef.current = globalSocket;

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id);
    });

    socket.on('job:progress', (data: JobProgress) => {
      setJobProgress(data);
      updateAssignmentStatus(data.assignmentId, data.status);
    });

    socket.on('job:completed', (data: JobProgress) => {
      setJobProgress(data);
      updateAssignmentStatus(data.assignmentId, 'completed', data.generatedPaper);
    });

    socket.on('job:failed', (data: JobProgress) => {
      setJobProgress(data);
      updateAssignmentStatus(data.assignmentId, 'failed');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      socket.off('job:progress');
      socket.off('job:completed');
      socket.off('job:failed');
    };
  }, [setJobProgress, updateAssignmentStatus]);

  const joinRoom = useCallback((assignmentId: string) => {
    socketRef.current?.emit('join:assignment', assignmentId);
  }, []);

  const leaveRoom = useCallback((assignmentId: string) => {
    socketRef.current?.emit('leave:assignment', assignmentId);
  }, []);

  return { socket: socketRef.current, joinRoom, leaveRoom };
}
