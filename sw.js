/**
 * Service Worker - sw.js
 * 提供离线缓存和 PWA 支持
 */

const CACHE_NAME = 'homework-guardian-v1';
const urlsToCache = [
    './',
    './index.html',
    './css/main.css',
    './js/app.js',
    './js/camera.js',
    './js/attention.js',
    './js/voice.js',
    './js/ai.js',
    './js/ui.js',
    './manifest.json'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
    console.log('Service Worker: 安装中...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: 缓存文件');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: 安装完成');
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('Service Worker: 激活中...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: 删除旧缓存', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截请求 - 网络优先，失败则使用缓存
self.addEventListener('fetch', (event) => {
    // 忽略非 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 忽略外部 API 请求（Claude API）
    if (event.request.url.includes('anthropic.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 检查响应是否有效
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // 克隆响应
                const responseToCache = response.clone();

                // 更新缓存
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // 网络请求失败，尝试使用缓存
                return caches.match(event.request).then((response) => {
                    if (response) {
                        console.log('Service Worker: 从缓存返回', event.request.url);
                        return response;
                    }
                    
                    // 缓存也没有，返回离线页面（可选）
                    console.log('Service Worker: 无缓存', event.request.url);
                });
            })
    );
});
