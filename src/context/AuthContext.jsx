
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
  } from "react";
  import { authApi } from "../services/api";
  
  const AuthContext = createContext(null);
  
  function saveAuthSession(result) {
    if (!result?.token || !result?.user) {
      throw new Error("Backend response mein token ya user missing hai.");
    }
  
    localStorage.setItem("token", result.token);
    return result.user;
  }
  
  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
  
    const refreshUser = useCallback(async () => {
      const token = localStorage.getItem("token");
  
      if (!token) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
  
      try {
        const result = await authApi.me();
  
        if (!result?.user) {
          throw new Error("Invalid session response");
        }
  
        setUser(result.user);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }, []);
  
    useEffect(() => {
      refreshUser();
    }, [refreshUser]);
  
    const login = async (credentials) => {
      const result = await authApi.login(credentials);
      const loggedInUser = saveAuthSession(result);
      setUser(loggedInUser);
      return loggedInUser;
    };
  
    const signup = async (details) => {
      const result = await authApi.signup(details);
      const newUser = saveAuthSession(result);
      setUser(newUser);
      return newUser;
    };
  
    const googleLogin = async (credential, role) => {
        const result = await authApi.google({
          idToken: credential,
          role,
        });
      
        const loggedInUser = saveAuthSession(result);
        setUser(loggedInUser);
        return loggedInUser;
      };
  
    const logout = () => {
      authApi.logout();
      setUser(null);
    };
  
    return (
      <AuthContext.Provider
        value={{
          user,
          authLoading,
          login,
          signup,
          googleLogin,
          logout,
          refreshUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }
  
  export function useAuth() {
    const context = useContext(AuthContext);
  
    if (!context) {
      throw new Error("useAuth must be used inside AuthProvider");
    }
  
    return context;
  }
  