import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function FarmProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] =
    useState(true);
    const [replyingTo, setReplyingTo] =
  useState<any>(null);

  const [product, setProduct] =
    useState<any>(null);
    const [likes, setLikes] =
  useState(0);

const [liked, setLiked] =
  useState(false);
const [comments, setComments] =
  useState<any[]>([]);

const [commentText, setCommentText] =
  useState("");

const [postingComment, setPostingComment] =
  useState(false);
const [currentUser, setCurrentUser] =
  useState<any>(null);
  

  const player = useVideoPlayer(
  product?.video_url || "",
  (player) => {
    player.loop = false;
  }
);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
  try {
    const { data, error } =
      await (supabase as any)
        .from("farm_stocks")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
      console.log(error);
      
      return;
    }

    setProduct({
      ...data,

      images:
        Array.isArray(data?.images)
          ? data.images
          : typeof data?.images === "string"
          ? JSON.parse(data.images)
          : [],
    });
    loadComments(
  data.id
);
    
    const {
  data: { user },
} =
  await supabase.auth.getUser();

setCurrentUser(user);

const {
  count,
} =
  await (supabase as any)
    .from(
      "farm_stock_likes"
    )
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "stock_id",
      data.id
    );

setLikes(
  count || 0
);

if (user) {
  const {
    data: likedData,
  } =
    await (supabase as any)
      .from(
        "farm_stock_likes"
      )
      .select("id")
      .eq(
        "stock_id",
        data.id
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  setLiked(
    !!likedData
  );
}

/* PRODUCT VIEW */
await (supabase as any)
  .from("farm_stocks")
  .update({
    views:
      (data.views || 0) + 1,
  })
  .eq("id", data.id);
  } catch (e) {
    console.log(e);
  }
 
  setLoading(false);
};
const loadComments =
  async (stockId: number) => {
    const { data, error } =
  await (supabase as any)
    .from("farm_stock_comments")
    .select(`
  *,
  profiles (
    full_name,
    avatar_url
  )
`)
    .eq("stock_id", stockId)
    .order("created_at", {
      ascending: false,
    });

console.log(
  "COMMENTS",
  data,
  error
);

setComments(data || [])
    
  };
  const submitComment =
  async () => {
    if (
      !currentUser ||
      !product ||
      !commentText.trim()
    ) {
      return;
    }

    setPostingComment(
      true
    );

   await (supabase as any)
  .from("farm_stock_comments")
  .insert({
    stock_id: product.id,
    user_id: currentUser.id,
    comment: commentText,
    parent_comment_id:
      replyingTo?.id || null,
  });

   setReplyingTo(null);
setCommentText("");
    await loadComments(
      product.id
    );

    setPostingComment(
      false
    );
  };

  const renderReplies = (
  parentId: number,
  level = 1
) => {
  return comments
    .filter(
      (c) =>
        c.parent_comment_id === parentId
    )
    .map((c) => (
      <View
        key={c.id}
        style={{
          marginLeft: level * 20,
          marginTop: 10,
          backgroundColor: "#1f2937",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#22c55e",
            fontWeight: "bold",
          }}
        >
          {c.profiles?.full_name}
        </Text>

        <Text
          style={{
            color: "#fff",
          }}
        >
          {c.comment}
        </Text>

        <TouchableOpacity
          onPress={() =>
            setReplyingTo(c)
          }
        >
          <Text
            style={{
              color: "#38bdf8",
              marginTop: 6,
            }}
          >
            Reply
          </Text>
        </TouchableOpacity>

        {renderReplies(
          c.id,
          level + 1
        )}
      </View>
    ));
};
 const toggleLike =
  async () => {
    if (
      !currentUser ||
      !product
    ) {
      return;
    }

    if (liked) {
      await (supabase as any)
        .from(
          "farm_stock_likes"
        )
        .delete()
        .eq(
          "stock_id",
          product.id
        )
        .eq(
          "user_id",
          currentUser.id
        );

      setLiked(false);

      setLikes(
        (x) =>
          Math.max(
            0,
            x - 1
          )
      );
    } else {
      await (supabase as any)
        .from(
          "farm_stock_likes"
        )
        .insert({
          stock_id:
            product.id,
          user_id:
            currentUser.id,
        });

      setLiked(true);

      setLikes(
        (x) =>
          x + 1
      );
    }
  };
 

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
          backgroundColor:
            "#0f172a",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#fff"
        />
      </View>
    );
  }

  if (!product) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
          backgroundColor:
            "#0f172a",
        }}
      >
        <Text
          style={{
            color: "#fff",
          }}
        >
          Product not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor:
          "#0f172a",
      }}
    >
      
      {product.video_url ? (
  <VideoView
    player={player}
    nativeControls
    style={{
      width: "100%",
      height: 350,
    }}
  />
) : product.images?.length > 0 ? (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
  >
    {product.images.map(
      (
        img: string,
        index: number
      ) => (
        <Image
          key={index}
          source={{ uri: img }}
          style={{
            width: 350,
            height: 350,
            borderRadius: 12,
            marginRight: 8,
          }}
          contentFit="cover"
        />
      )
    )}
  </ScrollView>
) : product.image_url ? (
  <Image
    source={{
      uri:
        product.image_url,
    }}
    style={{
      width: "100%",
      aspectRatio: 1,
    }}
    contentFit="cover"
  />
) : null}
      <View
        style={{
          padding: 16,
        }}
      >
        <Text
          style={{
            color: "#22c55e",
            fontSize: 14,
            fontWeight:
              "bold",
          }}
        >
          {product.category}
        </Text>

        <Text
          style={{
            color: "#fff",
            fontSize: 24,
            fontWeight:
              "bold",
            marginTop: 6,
          }}
        >
          {product.product_name}
        </Text>
        <Text
  style={{
    color: "#94a3b8",
    marginTop: 4,
  }}
>
  👀 {product.views || 0} Views
</Text>
<Text
  style={{
    color: "#94a3b8",
    marginTop: 4,
  }}
>
  ❤️ {likes} Likes
</Text>
        {product.is_sold && (
  <Text
    style={{
      color: "#ef4444",
      fontWeight: "bold",
      fontSize: 18,
      marginTop: 8,
    }}
  >
    SOLD OUT
  </Text>
)}

        <Text
          style={{
            color: "#cbd5e1",
            marginTop: 10,
          }}
        >
          Quantity:
          {" "}
          {product.quantity}
          {" "}
          {product.unit}
        </Text>

        {product.price ? (
          <Text
            style={{
              color:
                "#22c55e",
              fontSize: 22,
              fontWeight:
                "bold",
              marginTop: 10,
            }}
          >
            GH₵{" "}
            {Number(
              product.price
            ).toLocaleString()}
          </Text>
        ) : null}
        <TouchableOpacity
  onPress={
    toggleLike
  }
  style={{
    backgroundColor:
      liked
        ? "#ef4444"
        : "#2563eb",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  }}
>
  <Text
    style={{
      color: "#fff",
      textAlign:
        "center",
      fontWeight:
        "bold",
    }}
  >
    {liked
      ? "❤️ Liked"
      : "🤍 Like Product"}
  </Text>
</TouchableOpacity>

<View
  style={{
    marginTop: 24,
  }}
>
  
  <Text
    style={{
      color: "#fff",
      fontWeight: "bold",
      fontSize: 18,
      marginBottom: 10,
    }}
  >
    Comments
    ({comments.length})
  </Text>
{replyingTo && (
  <View
    style={{
      backgroundColor: "#1f2937",
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        color: "#38bdf8",
      }}
    >
      Replying to:
    </Text>

    <Text
      style={{
        color: "#fff",
        marginTop: 4,
      }}
    >
      {replyingTo.comment}
    </Text>

    <TouchableOpacity
      onPress={() =>
        setReplyingTo(null)
      }
    >
      <Text
        style={{
          color: "#ef4444",
          marginTop: 6,
          fontWeight: "bold",
        }}
      >
        Cancel Reply
      </Text>
    </TouchableOpacity>
  </View>
)}
  <TextInput
    value={commentText}
    onChangeText={
      setCommentText
    }
    placeholder="Write a comment..."
    placeholderTextColor="#94a3b8"
    style={{
      backgroundColor:
        "#1f2937",
      color: "#fff",
      borderRadius: 10,
      padding: 12,
    }}
  />

  <TouchableOpacity
    onPress={
      submitComment
    }
    disabled={
      postingComment
    }
    style={{
      backgroundColor:
        "#22c55e",
      padding: 12,
      borderRadius: 10,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        textAlign:
          "center",
        fontWeight:
          "bold",
      }}
    >
      Post Comment
    </Text>
  </TouchableOpacity>

  {comments
  .filter(
    (item) =>
      !item.parent_comment_id
  )
  .map(
    (item: any) => (
      <View
        key={item.id}
        style={{
          backgroundColor:
            "#111827",
          padding: 12,
          borderRadius: 10,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            color: "#22c55e",
            fontWeight:
              "bold",
          }}
        >
          {item.profiles
            ?.full_name ||
            "User"}
        </Text>

        <Text
          style={{
            color: "#fff",
            marginTop: 4,
          }}
        >
          {item.comment}
        </Text>
        <TouchableOpacity
  onPress={() =>
    setReplyingTo(item)
  }
>
 <Text
  style={{
    color: "#38bdf8",
    marginTop: 6,
  }}
>
  Reply to {item.profiles?.full_name}
</Text>
</TouchableOpacity>
{renderReplies(item.id)}
      </View>
    )
  )}
  
</View>
        {product.images?.length >
          1 && (
          <Text
            style={{
              color:
                "#38bdf8",
              marginTop: 10,
            }}
          >
            {product.images.length}
            {" "}
            Photos
          </Text>
        )}
      </View>
    </ScrollView>
  );
}