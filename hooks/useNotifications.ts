import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from '../lib/notifications';

export function useNotifications(userId: string | undefined) {
  const router = useRouter();
  const responseListenerRef = useRef<ReturnType<typeof addNotificationResponseListener>>();
  const receivedListenerRef = useRef<ReturnType<typeof addNotificationReceivedListener>>();

  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;

    registerForPushNotifications(userId);

    receivedListenerRef.current = addNotificationReceivedListener((_notification) => {
    });

    responseListenerRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      const { type, gameId } = data as { type?: string; gameId?: string };

      if (gameId) {
        if (type === 'chat_message') {
          router.push(`/chat/${gameId}` as any);
        } else {
          router.push(`/game/${gameId}` as any);
        }
      }
    });

    return () => {
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [userId]);
}
