import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "./supabase"

type AuthContextType = {
  user: any
}

const AuthContext = createContext<AuthContextType>({
  user: null
})

export function AuthProvider({ children }: any) {

  const [user,setUser] = useState<any>(null)

  useEffect(()=>{

    async function loadUser(){

      const { data } = await supabase.auth.getUser()
      setUser(data.user)

    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event,session)=>{
      setUser(session?.user ?? null)
    })

    return ()=> listener.subscription.unsubscribe()

  },[])

  return(
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )

}

export function useAuth(){
  return useContext(AuthContext)
}