import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTok] = useState(getToken);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!token) return setLoading(false);
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveSession({ token, user }) {
    setToken(token);
    setTok(token);
    setUser(user);
    return user;
  }

  const login = async (email, password) => saveSession(await api('/auth/login', { method: 'POST', body: { email, password } }));
  const register = async (name, email, password) =>
    saveSession(await api('/auth/register', { method: 'POST', body: { name, email, password } }));

  function logout() {
    setToken(null);
    setTok(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
