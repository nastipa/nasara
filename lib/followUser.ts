import { supabase } from "./supabase";

export async function followUser(targetUserId:string){

const {data:session}=await supabase.auth.getSession();

const userId=session.session?.user.id;

if(!userId) return;

const {error}=await (supabase as any)
.from("followers")
.insert({
follower_id:userId,
following_id:targetUserId
});

if(error){
console.log("FOLLOW ERROR",error.message);
}

}