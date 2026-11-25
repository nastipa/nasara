import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "./supabase";

type AuthContextType = {
  user: any;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
});

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // Load the locally available session without
    // making another getUser() network request.
    const loadUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.log("AuthContext session error:", error.message);
          return;
        }

        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.log("AuthContext load error:", error);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}