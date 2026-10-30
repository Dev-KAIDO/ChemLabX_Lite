const CACHE = 'chemlabx-v14';
const APP_SHELL = [
    './',
    './index.html',
    './login.html',
    './register.html',
    './dashboard.html',
    './lab.html',
    './experiments.html',
    './lessons.html',
    './quiz.html',
    './profile.html',
    './admin.html',
    './manifest.webmanifest',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './css/base.css',
    './css/components.css',
    './css/landing.css',
    './css/auth.css',
    './css/dashboard.css',
    './css/lab.css',
    './css/quiz.css',
    './css/fonts.css',
    './fonts/cairo-arabic-200_1000.woff2',
    './fonts/cairo-latin-ext-200_1000.woff2',
    './fonts/cairo-latin-200_1000.woff2',
    './fonts/inter-cyrillic-ext-100_900.woff2',
    './fonts/inter-cyrillic-100_900.woff2',
    './fonts/inter-greek-ext-100_900.woff2',
    './fonts/inter-greek-100_900.woff2',
    './fonts/inter-vietnamese-100_900.woff2',
    './fonts/inter-latin-ext-100_900.woff2',
    './fonts/inter-latin-100_900.woff2',
    './fonts/roboto-mono-cyrillic-ext-100_700.woff2',
    './fonts/roboto-mono-cyrillic-100_700.woff2',
    './fonts/roboto-mono-greek-100_700.woff2',
    './fonts/roboto-mono-vietnamese-100_700.woff2',
    './fonts/roboto-mono-latin-ext-100_700.woff2',
    './fonts/roboto-mono-latin-100_700.woff2',
    './js/core/i18n.js',
    './js/core/versions.js',
    './js/core/dataport.js',
    './js/core/db.js',
    './js/core/auth.js',
    './js/core/ui.js',
    './js/data/materials.js',
    './js/data/reactions.js',
    './js/data/achievements.js',
    './js/domain/chemistry.js',
    './js/domain/laboratory.js',
    './js/domain/safety.js',
    './js/domain/results.js',
    './js/domain/education.js',
    './js/domain/content.js',
    './js/domain/changejournal.js',
    './js/domain/authorization.js',
    './js/data/content/manifest.js',
    './js/data/content/lessons.js',
    './js/data/content/quiz.js',
    './js/data/content/experiments.js',
    './js/pages/landing.js',
    './js/pages/auth.js',
    './js/pages/dashboard.js',
    './js/pages/experiments.js',
    './js/pages/lessons.js',
    './js/pages/quiz.js',
    './js/pages/profile.js',
    './js/pages/admin.js',
    './js/lab/particles.js',
    './js/lab/effects.js',
    './js/lab/shelf.js',
    './js/lab/bench.js',
    './js/lab/engine.js',
    './js/lab/lab.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request).then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, clone));
                }
                return response;
            }).catch(() => cached || new Response('', { status: 404, statusText: 'Not Found' }));
            return cached || network;
        })
    );
});
