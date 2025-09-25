// oauth.js - Handles third-party OAuth sign up/in for TaskZen
// NOTE: This is a client-side simulation. In production, use a backend for secure OAuth.

const OAUTH_PROVIDERS = {
    google: {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: 'YOUR_GOOGLE_CLIENT_ID',
        scope: 'profile email',
        redirectUri: window.location.origin + '/oauth-callback.html',
        icon: 'src/assets/icons/google.svg'
    },
    microsoft: {
        name: 'Microsoft',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        clientId: 'YOUR_MICROSOFT_CLIENT_ID',
        scope: 'User.Read email openid profile',
        redirectUri: window.location.origin + '/oauth-callback.html',
        icon: 'src/assets/icons/microsoft.svg'
    },
    apple: {
        name: 'Apple',
        authUrl: 'https://appleid.apple.com/auth/authorize',
        clientId: 'YOUR_APPLE_CLIENT_ID',
        scope: 'name email',
        redirectUri: window.location.origin + '/oauth-callback.html',
        icon: 'src/assets/icons/apple.svg'
    }
};

function openOAuthPopup(providerKey) {
    const provider = OAUTH_PROVIDERS[providerKey];
    if (!provider) return;
    const state = Math.random().toString(36).substring(2);
    const url = `${provider.authUrl}?client_id=${encodeURIComponent(provider.clientId)}&redirect_uri=${encodeURIComponent(provider.redirectUri)}&response_type=token&scope=${encodeURIComponent(provider.scope)}&state=${state}`;
    const popup = window.open(url, 'oauthPopup', 'width=500,height=600');
    
    // Listen for message from popup
    window.addEventListener('message', function handler(event) {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'oauth-success') {
            window.removeEventListener('message', handler);
            handleOAuthSuccess(event.data.provider, event.data.user, event.data.token);
        }
    });
}

function handleOAuthSuccess(provider, user, token) {
    // Store user info and token
    localStorage.setItem('taskzen_user', JSON.stringify({ provider, user, token }));
    // Hide auth UI and reload app
    document.getElementById('authContainer').style.display = 'none';
    document.body.classList.remove('auth-required');
    // Optionally, update UI with user info
    // ...
    location.reload();
}

function setupOAuthButtons() {
    document.getElementById('googleSignUp')?.addEventListener('click', () => openOAuthPopup('google'));
    document.getElementById('microsoftSignUp')?.addEventListener('click', () => openOAuthPopup('microsoft'));
    document.getElementById('appleSignUp')?.addEventListener('click', () => openOAuthPopup('apple'));
    document.getElementById('continueWithoutAccount')?.addEventListener('click', () => {
        document.getElementById('authContainer').style.display = 'none';
        document.body.classList.remove('auth-required');
    });
}

// On load, show auth UI if not signed in
export function showAuthIfNeeded() {
    const user = localStorage.getItem('taskzen_user');
    if (!user) {
        document.getElementById('authContainer').style.display = 'flex';
        document.body.classList.add('auth-required');
        setupOAuthButtons();
    } else {
        document.getElementById('authContainer').style.display = 'none';
        document.body.classList.remove('auth-required');
    }
}

// Call this on app start
showAuthIfNeeded();
