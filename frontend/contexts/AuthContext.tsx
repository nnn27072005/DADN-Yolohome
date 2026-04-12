import React, { createContext, useContext, useEffect, useState } from "react";
import { getValueFor, save, removeValueFor } from "@/utils/handleAccessToken";

type AuthContextType = {
  token: string | null;
  username: string | null;
  fullname: string | null;
  isAuthenticated: boolean;
  setAuthData: (token: string, username: string, fullname: string) => Promise<void>;
  removeToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [fullname, setFullnameState] = useState<string | null>(null);

  const setAuthData = async (newToken: string, newUsername: string, newFullname: string) => {
    await save("token", newToken);
    await save("username", newUsername);
    await save("fullname", newFullname);
    setTokenState(newToken);
    setUsernameState(newUsername);
    setFullnameState(newFullname);
  };

  const removeToken = async () => {
    await removeValueFor("token");
    await removeValueFor("username");
    await removeValueFor("fullname");
    setTokenState(null);
    setUsernameState(null);
    setFullnameState(null);
  };

  useEffect(() => {
    const loadAuthData = async () => {
      const storedToken = await getValueFor("token");
      const storedUsername = await getValueFor("username");
      const storedFullname = await getValueFor("fullname");
      setTokenState(storedToken);
      setUsernameState(storedUsername);
      setFullnameState(storedFullname);
    };
    loadAuthData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        username,
        fullname,
        isAuthenticated: !!token,
        setAuthData,
        removeToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
