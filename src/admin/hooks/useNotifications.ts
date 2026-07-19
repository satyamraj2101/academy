import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'new_enquiry' | 'new_chat' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    setPermissionGranted(Notification.permission === 'granted');
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermissionGranted(result === 'granted');
    }
  };

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const n: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [n, ...prev].slice(0, 50));
    // Browser push notification
    if (permissionGranted) {
      new Notification(n.title, { body: n.message, icon: '/favicon.ico' });
    }
  }, [permissionGranted]);

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, addNotification, markRead, markAllRead, requestPermission, permissionGranted };
}
