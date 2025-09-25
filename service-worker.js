const APP_VERSION = '2.0.0';
const CACHE_NAME = `taskzen-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `taskzen-dynamic-${APP_VERSION}`;
const API_CACHE = `taskzen-api-${APP_VERSION}`;
const IMAGE_CACHE = `taskzen-images-${APP_VERSION}`;

// Enhanced static assets for mobile-first web app
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    '/src/css/style.css',
    '/src/css/themes.css',
    '/src/css/mobile-enhancements.css',
    '/src/js/app.js',
    '/src/js/mobile-enhancements.js',
    '/src/js/utils/storage.js',
    '/src/js/utils/notifications.js',
    '/src/js/utils/dateUtils.js',
    '/src/js/utils/taskManager.js',
    '/src/js/models/Task.js',
    '/src/js/models/Category.js',
    '/src/js/components/task.js',
    '/src/js/components/kanban.js',
    '/src/js/components/calendar.js',
    '/src/js/components/pomodoro.js',
    '/src/js/components/analytics.js',
    '/src/assets/icons/icon-72x72.png',
    '/src/assets/icons/icon-96x96.png',
    '/src/assets/icons/icon-128x128.png',
    '/src/assets/icons/icon-144x144.png',
    '/src/assets/icons/icon-152x152.png',
    '/src/assets/icons/icon-192x192.png',
    '/src/assets/icons/icon-384x384.png',
    '/src/assets/icons/icon-512x512.png',
    '/src/assets/icons/favicon.png',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// URLs that should always be fetched from network
const NETWORK_FIRST_PATTERNS = [
    /\/api\//,
    /\/sync\//,
    /\/notifications\//
];

// Maximum cache sizes
const CACHE_LIMITS = {
    [DYNAMIC_CACHE]: 50,
    [API_CACHE]: 30,
    [IMAGE_CACHE]: 100
};

// Install Service Worker
self.addEventListener('install', (event) => {
    console.log('ServiceWorker installing...');
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            }),
            caches.open(DYNAMIC_CACHE),
            caches.open(API_CACHE),
            caches.open(IMAGE_CACHE)
        ]).then(() => {
            console.log('ServiceWorker installation complete');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('ServiceWorker installation failed:', error);
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    console.log('ServiceWorker activating...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheName.includes(APP_VERSION)) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ]).then(() => {
            console.log('ServiceWorker activation complete');
        })
    );
});

// Enhanced Fetch Handler with Mobile Optimizations
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and browser extensions
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle different request types with appropriate strategies
    if (isStaticAsset(url)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(url)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// Helper functions for request classification
function isStaticAsset(url) {
    return url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
}

function isAPIRequest(url) {
    return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isImageRequest(request) {
    return request.destination === 'image';
}

function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// Cache-first strategy for static assets
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('Static asset fetch failed:', error);
        return caches.match('/offline.html');
    }
}

// Network-first strategy for API requests with offline fallback
async function handleAPIRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
            await maintainCacheSize(API_CACHE);
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const response = cachedResponse.clone();
            response.headers.set('X-Served-By', 'sw-cache');
            return response;
        }
        return new Response(JSON.stringify({ 
            error: 'Offline', 
            message: 'Request failed and no cached version available' 
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Cache-first strategy for images with size management
async function handleImageRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(IMAGE_CACHE);
            cache.put(request, networkResponse.clone());
            await maintainCacheSize(IMAGE_CACHE);
        }
        return networkResponse;
    } catch (error) {
        return caches.match('/src/assets/icons/placeholder.png') || 
               new Response('', { status: 404 });
    }
}

// Navigation requests with offline page fallback
async function handleNavigationRequest(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match('/index.html');
        return cachedResponse || caches.match('/offline.html');
    }
}

// Network-first for dynamic content
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            await maintainCacheSize(DYNAMIC_CACHE);
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('', { status: 404 });
    }
}

// Cache size management
async function maintainCacheSize(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const limit = CACHE_LIMITS[cacheName] || 50;
    
    if (keys.length > limit) {
        const keysToDelete = keys.slice(0, keys.length - limit);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

// Background Sync for Offline Tasks
self.addEventListener('sync', (event) => {
    if (event.tag === 'taskSync') {
        event.waitUntil(syncTasks());
    } else if (event.tag === 'backgroundSync') {
        event.waitUntil(performBackgroundSync());
    }
});

async function syncTasks() {
    try {
        console.log('Syncing tasks...');
        await self.registration.showNotification('TaskZen', {
            body: 'Tasks synchronized successfully',
            icon: '/src/assets/icons/icon-192x192.png',
            tag: 'sync-success'
        });
    } catch (error) {
        console.error('Task sync failed:', error);
    }
}

async function performBackgroundSync() {
    try {
        console.log('Performing background sync...');
    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

// Enhanced Push Notifications
self.addEventListener('push', (event) => {
    let options = {
        body: 'You have new task updates',
        icon: '/src/assets/icons/icon-192x192.png',
        badge: '/src/assets/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'task-notification',
        actions: [
            { action: 'view', title: 'View Tasks' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        data: { url: '/' }
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            options = { ...options, ...payload };
        } catch (error) {
            options.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification('TaskZen', options)
    );
});

// Enhanced Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Periodic Background Sync for task reminders
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'taskReminder') {
        event.waitUntil(sendTaskReminders());
    }
});

async function sendTaskReminders() {
    try {
        await self.registration.showNotification('TaskZen Reminder', {
            body: 'Check your tasks for today!',
            icon: '/src/assets/icons/icon-192x192.png',
            badge: '/src/assets/icons/icon-72x72.png',
            tag: 'task-reminder',
            actions: [
                { action: 'view', title: 'View Tasks' }
            ]
        });
    } catch (error) {
        console.error('Failed to send task reminders:', error);
    }
}

// Message handling for app updates and communication
self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: APP_VERSION });
            break;
        case 'CACHE_URLS':
            event.waitUntil(cacheUrls(data.urls));
            break;
        case 'CLEAR_CACHE':
            event.waitUntil(clearSpecificCache(data.cacheName));
            break;
        default:
            console.log('Unknown message type:', type);
    }
});

async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
}

async function clearSpecificCache(cacheName) {
    await caches.delete(cacheName);
}