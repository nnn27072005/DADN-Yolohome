import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useWebSocket } from "./WebSocketProvider";
import { apiCall } from "@/utils/apiCall";
import { useAuth } from "./AuthContext";

interface MessageType {
  id: number;
  is_read: boolean;
  message: string;
  related_entity_id: string;
  timestamp: string;
  type: string;
  user_id: number;
}

type NotificationContextType = {
  notifications: MessageType[];
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const webSocketContext = useWebSocket();
  const messages = webSocketContext?.messages || [];
  const [notifications, setNotifications] = useState<MessageType[]>([]);
  const hasFetched = useRef(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!hasFetched.current) {
      apiCall({
        method: "GET",
        endpoint: "/notifications",
      }).then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
        hasFetched.current = true;
      });
    }
  }, []);
  useEffect(() => {
    if (!token || hasFetched.current) return;

    const fetchNotifications = async () => {
      try {
        const data = await apiCall({
          method: "GET",
          endpoint: "/notifications",
        });
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
        hasFetched.current = true;
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
  }, [token]);

  useEffect(() => {
    const merge = () => {
      const currentNotifications = Array.isArray(notifications) ? notifications : [];
      const currentMessages = Array.isArray(messages) ? messages : [];
      const uniqueNotifications = Array.from(
        new Set([...currentNotifications, ...currentMessages])
      );

      setNotifications(uniqueNotifications);
    };

    merge();
  }, [messages]);

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
