const TOKEN_KEY = 'spendwise.token';

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (cause) {
    console.warn('Session storage unavailable', cause);
    return null;
  }
}

export function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (cause) {
    console.warn('Could not persist session', cause);
  }
}
