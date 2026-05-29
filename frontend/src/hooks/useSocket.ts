'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAssignmentStore } from '@/store/assignmentStore';
import { JobProgress } from '@/types';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
let globalSocket: Socket | null = null;
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { setJobProgress, updateAssignmentStatus, fetchAssignment, stopPolling } = useAssignmentStore();
  useEffect(() => {
    if (!globalSocket) globalSocket = io(SOCKET_URL, { transports: ['polling','websocket'], reconnection: true, reconnectionDelay: 2000, reconnectionAttempts: 10 });
    socketRef.current = globalSocket;
    const s = socketRef.current;
    s.on('job:progress', (d: JobProgress) => { setJobProgress(d); updateAssignmentStatus(d.assignmentId, d.status); });
    s.on('job:completed', (d: JobProgress) => { setJobProgress(null); updateAssignmentStatus(d.assignmentId, 'completed', d.generatedPaper); stopPolling(d.assignmentId); setTimeout(() => fetchAssignment(d.assignmentId), 300); });
    s.on('job:failed', (d: JobProgress) => { setJobProgress(null); updateAssignmentStatus(d.assignmentId, 'failed'); stopPolling(d.assignmentId); });
    return () => { s.off('job:progress'); s.off('job:completed'); s.off('job:failed'); };
  }, [setJobProgress, updateAssignmentStatus, fetchAssignment, stopPolling]);
  const joinRoom = useCallback((id: string) => socketRef.current?.emit('join:assignment', id), []);
  const leaveRoom = useCallback((id: string) => socketRef.current?.emit('leave:assignment', id), []);
  return { socket: socketRef.current, joinRoom, leaveRoom };
}
