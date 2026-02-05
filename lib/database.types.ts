export type Database = {
  public: {
    Tables: {
      offers: {
  Row: {
    id: string;
    item_id: number;
    buyer_id: string;
    seller_id: string;
    price: number;
    status: string;
    counter_price: number | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    item_id: number;
    buyer_id: string;
    seller_id: string;
    price: number;
    status?: string;
    counter_price?: number | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    item_id?: number;
    buyer_id?: string;
    seller_id?: string;
    price?: number;
    status?: string;
    counter_price?: number | null;
    created_at?: string;
  };
};

      items_live: {
        Row: {
          id: number;
          title: string;
          price: number;
          description: string | null;
          image_url: string | null;
          video_url: string | null;
          location: string | null;
          user_id: string | null;   // 🔥 THIS WAS MISSING (VERY IMPORTANT)
        };
        Insert: {
          id?: number;
          title: string;
          price: number;
          description?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          location?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: number;
          title?: string;
          price?: number;
          description?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          location?: string | null;
          user_id?: string | null;
        };
      };

      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          location: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          location?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          location?: string | null;
          avatar_url?: string | null;
        };
      };
    };
  };
};
