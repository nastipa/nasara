import { supabase } from "./supabase";

export async function likePost(postId:string){

const {data:session}=await supabase.auth.getSession();

const userId=session.session?.user.id;

if(!userId) return;

const {error}=await (supabase as any)
.from("post_likes")
.insert({
post_id:postId,
user_id:userId
});

if(error){
console.log("LIKE ERROR",error.message);
}

}