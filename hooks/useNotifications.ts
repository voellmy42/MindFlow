
import { useState, useCallback, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        if (permission === 'granted') {
            // Get the token if already granted
            requestPermission();
        }
    }, []); // Only run once on mount

    useEffect(() => {
        // Listen for foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            // Optional: Show a toast or in-app notification here
            // For now, let's just log it or maybe trigger a standard notification if the document is visible
            // Note: Browsers generally don't show system notifications if the tab is focused, 
            // so you might want to show a custom UI element.
            const { title, body } = payload.notification || {};
            if (title) {
                new Notification(title, { body, icon: '/icon-192.png' });
            }
        });

        return () => unsubscribe();
    }, []);

    const requestPermission = useCallback(async () => {
        console.log('Requesting notification permission...');
        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                console.log('Notification permission granted.');

                // Get the registration from the service worker
                const registration = await navigator.serviceWorker.ready;

                // Get FCM Token
                // IMPORTANT: If you have a VAPID key, pass it here: { vapidKey: 'YOUR_VAPID_KEY', serviceWorkerRegistration: registration }
                const token = await getToken(messaging, {
                    vapidKey: 'BEkIukF0qOFvF_Bqmi4QSqLXC6RgJgZMD0okiUGMetG7ijel1s8zLHjhhI2Z8amYq2pJrMVc2MgcrYO8QSlvKnc',
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    console.log('FCM Token:', token);
                    setFcmToken(token);
                    // TODO: Save this token to the user's document in Firestore if needed for server-side sending
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                console.log('Notification permission denied.');
            }
        } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
        }
    }, []);

    return { permission, requestPermission, fcmToken };
}
