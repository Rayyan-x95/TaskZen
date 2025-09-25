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

// Configuration for different caching strategies
const CACHE_STRATEGIES = {
    static: 'cache-first',
    dynamic: 'network-first',
    api: 'network-first',
    images: 'cache-first'
};

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
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
            caches.open(DYNAMIC_CACHE),
            caches.open(API_CACHE)
        ]).then(() => {
            // Skip waiting to activate the new service worker immediately
            return self.skipWaiting();
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Check if the cache is old by looking at the version in the name
                        if (!cacheName.includes(APP_VERSION)) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
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
            // Add offline indicator to response
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
        // Return placeholder image or cached fallback
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
    if (event.request.method !== 'GET') return;

    // Handle API requests differently
    if (event.request.url.includes('/api/')) {
        event.respondWith(handleApiRequest(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if available
                if (cachedResponse) {
                    // Fetch and cache update in background
                    event.waitUntil(updateCache(event.request));
                    return cachedResponse;
                }

                // If not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the fetched response
                        event.waitUntil(
                            caches.open(DYNAMIC_CACHE)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                })
                        );

                        return response;
                    })
                    .catch(() => {
                        // If fetch fails, return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        return null;
                    });
            })
    );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        // Try network first
        const response = await fetch(request);
        // Clone the response before returning it
        const responseToCache = response.clone();
        
        // Cache the successful response
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, responseToCache);
        
        return response;
    } catch (error) {
        // If network fails, try cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // If both network and cache fail, return error response
        return new Response(JSON.stringify({ error: 'Network and cache both unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Update cached response in the background
async function updateCache(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    try {
        const response = await fetch(request);
        await cache.put(request, response);
        return true;
    } catch (error) {
        return false;
    }
}

// Listen for push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/src/assets/icons/icon-192x192.png',
            badge: '/src/assets/icons/icon-72x72.png',
            data: data.data
        })
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notificationData = event.notification.data;
    let urlToOpen = '/';

    if (notificationData && notificationData.taskId) {
        urlToOpen = `/task/${notificationData.taskId}`;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If no window is open, open a new one
                if (self.clients.openWindow) {
                    return self.clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle sync events for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});