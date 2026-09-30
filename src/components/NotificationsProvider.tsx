"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type Notification = {
  id: string;
  message: string;
  tarih: string; // ISO
  okundu: boolean;
};

const STORAGE_KEY = "bildirimler";
const MAX_NOTIFICATIONS = 20;

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function localStorageDenOku(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // Bildirim geçmişi tarayıcıda hatırlansın diye localStorage'a yazılır. Bir
  // effect içinde SONRADAN yüklemek yerine lazy initializer ile doğrudan
  // burada okunuyor — aksi halde bir alt bileşenin mount effect'i (ör. parsel
  // sınırı güncellenince addNotification çağırması) bu provider'ın kendi yükleme
  // effect'inden ÖNCE çalışabiliyordu (React effectleri çocuktan ataya doğru
  // tetiklenir) ve az önce eklenen bildirim localStorage'daki eski listeyle
  // eziliyordu. NotificationBell, hydration uyuşmazlığı olmasın diye kırmızı
  // noktayı ilk client render'da değil, kendi "mounted" effect'inden sonra gösterir.
  const [notifications, setNotifications] = useState<Notification[]>(() => localStorageDenOku());

  const persist = useCallback((list: Notification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // gizli sekme / depolama kapalı — sessizce yok say
    }
  }, []);

  const addNotification = useCallback(
    (message: string) => {
      setNotifications((prev) => {
        const next = [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            message,
            tarih: new Date().toISOString(),
            okundu: false,
          },
          ...prev,
        ].slice(0, MAX_NOTIFICATIONS);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.okundu)) return prev;
      const next = prev.map((n) => ({ ...n, okundu: true }));
      persist(next);
      return next;
    });
  }, [persist]);

  const unreadCount = notifications.filter((n) => !n.okundu).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications, NotificationsProvider içinde kullanılmalı.");
  return ctx;
}
