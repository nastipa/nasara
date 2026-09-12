import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const CART_STORAGE_KEY = "nasara_restaurant_cart";

const CUSTOM_PLATE_STORAGE_KEY =
  "nasara_restaurant_custom_plate_cart";

type Restaurant = {
  id: string;
  name: string;
  phone: string;
  address: string;
  logo_url: string | null;
  cover_image_url: string | null;
  is_open: boolean;
  status: string;
  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;
  momo_provider: string | null;
  momo_number: string | null;
 
};

type FixedCartItem = {
  menuItemId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type StoredCartItem = {
  menuItemId?: string;
  restaurantId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  quantity?: number;

  menuItem?: {
    id: string;
    restaurant_id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    preparation_time_minutes: number | null;
    is_available: boolean;
    is_featured: boolean;
  };
};

type StoredFixedCart = {
  restaurantId?: string;
  restaurantName?: string;
  items?: StoredCartItem[];
};

type CustomPlateItem = {
  menuItemId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
};

type StoredCustomPlateItem = {
  menuItemId?: string;
  restaurantId?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  amount?: number | string;
};

type CustomPlate = {
  plateId: string;
  plateNumber: number;
  items: CustomPlateItem[];
  total: number;
};

type StoredCustomPlate = {
  plateId?: string;
  plateNumber?: number;
  items?: StoredCustomPlateItem[];
  total?: number;
};

type StoredCustomPlateCart = {
  restaurantId?: string;
  restaurantName?: string;
  customPlates?: StoredCustomPlate[];
};
type OrderType = "immediate" | "scheduled";

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(
        message ? `${title}\n\n${message}` : title);
      
    }

    return;
  }

  const { Alert } = require("react-native");

  Alert.alert(title, message);
}

function formatMoney(amount: number) {
  return `GH₵ ${Number(amount || 0).toFixed(2)}`;
}

function createOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `NSR-FOOD-${year}${month}${day}-${random}`;
}

function createPaymentReference() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `NSR-PAY-${Date.now()}-${random}`;
}

function normalizeFixedCartItem(
  item: StoredCartItem
): FixedCartItem | null {
  if (item.menuItem) {
    return {
      menuItemId: item.menuItem.id,

      restaurantId:
        item.menuItem.restaurant_id,

      name: item.menuItem.name,

      description:
        item.menuItem.description,

      price: Number(
        item.menuItem.price || 0
      ),

      imageUrl:
        item.menuItem.image_url,

      quantity: Math.max(
        1,
        Number(item.quantity || 1)
      ),
    };
  }

  if (
    !item.menuItemId ||
    !item.restaurantId ||
    !item.name ||
    typeof item.price !== "number"
  ) {
    return null;
  }

  return {
    menuItemId:
      item.menuItemId,

    restaurantId:
      item.restaurantId,

    name:
      item.name,

    description:
      item.description ?? null,

    price:
      Number(item.price),

    imageUrl:
      item.imageUrl ?? null,

    quantity:
      Math.max(
        1,
        Number(item.quantity || 1)
      ),
  };
}

function normalizeCustomPlateItem(
  item: StoredCustomPlateItem,
  restaurantId: string
): CustomPlateItem | null {
  if (
    !item.menuItemId ||
    !item.name
  ) {
    return null;
  }

  const amount =
    Number(item.amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return {
    menuItemId:
      item.menuItemId,

    restaurantId:
      item.restaurantId ||
      restaurantId,

    name:
      item.name,

    description:
      item.description ?? null,

    imageUrl:
      item.imageUrl ?? null,

    amount,
  };
}

function normalizeCustomPlate(
  plate: StoredCustomPlate,
  restaurantId: string,
  fallbackNumber: number
): CustomPlate | null {
  const normalizedItems =
    (plate.items || [])
      .map((item) =>
        normalizeCustomPlateItem(
          item,
          restaurantId
        )
      )
      .filter(Boolean) as CustomPlateItem[];

  if (
    normalizedItems.length === 0
  ) {
    return null;
  }

  const calculatedTotal =
    normalizedItems.reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0),
      0
    );

  if (
    !Number.isFinite(
      calculatedTotal
    ) ||
    calculatedTotal <= 0
  ) {
    return null;
  }

  return {
    plateId:
      plate.plateId ||
      `plate-${fallbackNumber}-${Date.now()}`,

    plateNumber:
      Number(
        plate.plateNumber ||
          fallbackNumber
      ),

    items:
      normalizedItems,

    total:
      calculatedTotal,
  };
}

function formatDateInputValue(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  const hours = String(
    value.getHours()
  ).padStart(2, "0");

  const minutes = String(
    value.getMinutes()
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getMinimumScheduledDate() {
  return new Date(
    Date.now() + 5 * 60 * 1000
  );
}
export default function RestaurantPaymentScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      restaurantId?:
        | string
        | string[];

      orderMode?:
        | string
        | string[];
    }>();

  const restaurantId =
    Array.isArray(
      params.restaurantId
    )
      ? params.restaurantId[0]
      : params.restaurantId;

  const orderMode =
    Array.isArray(
      params.orderMode
    )
      ? params.orderMode[0]
      : params.orderMode;

  const [loading, setLoading] =
    useState(true);

  const [paying, setPaying] =
    useState(false);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [fixedItems, setFixedItems] =
    useState<FixedCartItem[]>([]);

  const [
    customPlates,
    setCustomPlates,
  ] = useState<CustomPlate[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [momoProvider, setMomoProvider] =
    useState("");

  const [momoName, setMomoName] =
    useState("");

  const [momoNumber, setMomoNumber] =
    useState("");

  const [paymentNote, setPaymentNote] =
    useState("");
    const [orderType, setOrderType] =
  useState<OrderType>("immediate");

const [scheduledFor, setScheduledFor] =
  useState<Date | null>(null);

const [showDatePicker, setShowDatePicker] =
  useState(false);

const [showTimePicker, setShowTimePicker] =
  useState(false);

  const loadRestaurant =
    useCallback(async () => {
      if (!restaurantId) {
        return;
      }

      const {
        data,
        error,
      } = await (supabase as any)
        .from("restaurants")
        .select(
          `
          id,
          name,
          phone,
          address,
          logo_url,
          cover_image_url,
          is_open,
          status,
          accepts_momo,
          accepts_cash,
          accepts_card,
          momo_provider,
          momo_number
         
          `
        )
        .eq(
          "id",
          restaurantId
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Restaurant payment load error:",
          error
        );

        throw error;
      }

      setRestaurant(
        data as Restaurant | null
      );
    }, [restaurantId]);

  const loadFixedCart =
    useCallback(async () => {
      const raw =
        await AsyncStorage.getItem(
          CART_STORAGE_KEY
        );

      if (!raw) {
        setFixedItems([]);
        return;
      }

      let stored:
        StoredFixedCart;

      try {
        stored =
          JSON.parse(raw);
      } catch (error) {
        console.error(
          "Fixed cart JSON error:",
          error
        );

        setFixedItems([]);

        return;
      }

      if (
        restaurantId &&
        stored.restaurantId &&
        stored.restaurantId !==
          restaurantId
      ) {
        setFixedItems([]);

        return;
      }

      const items =
        (stored.items || [])
          .map(
            normalizeFixedCartItem
          )
          .filter(
            Boolean
          ) as FixedCartItem[];

      setFixedItems(items);
    }, [restaurantId]);

  const loadCustomPlateCart =
    useCallback(async () => {
      if (!restaurantId) {
        setCustomPlates([]);

        return;
      }

      const raw =
        await AsyncStorage.getItem(
          CUSTOM_PLATE_STORAGE_KEY
        );

      if (!raw) {
        setCustomPlates([]);

        return;
      }

      let stored:
        StoredCustomPlateCart;

      try {
        stored =
          JSON.parse(raw);
      } catch (error) {
        console.error(
          "Custom plate cart JSON error:",
          error
        );

        setCustomPlates([]);

        return;
      }

      if (
        stored.restaurantId &&
        stored.restaurantId !==
          restaurantId
      ) {
        setCustomPlates([]);

        return;
      }

      const plates =
        (stored.customPlates || [])
          .map(
            (
              plate,
              index
            ) =>
              normalizeCustomPlate(
                plate,
                restaurantId,
                index + 1
              )
          )
          .filter(
            Boolean
          ) as CustomPlate[];

      const normalizedPlates =
        plates.map(
          (
            plate,
            index
          ) => ({
            ...plate,

            plateNumber:
              index + 1,
          })
        );

      setCustomPlates(
        normalizedPlates
      );
    }, [restaurantId]);

  const loadCustomer =
    useCallback(async () => {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } = await (supabase as any)
        .from("profiles")
        .select(
          "full_name, phone"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

      if (error) {
        console.log(
          "Profile load error:",
          error
        );

        return;
      }

      if (data?.full_name) {
        setCustomerName(
          data.full_name
        );
      }

      if (data?.phone) {
        setCustomerPhone(
          data.phone
        );
      }
    }, []);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        await Promise.all([
          loadRestaurant(),
          loadFixedCart(),
          loadCustomPlateCart(),
          loadCustomer(),
        ]);
      } catch (error) {
        console.error(
          "Payment screen error:",
          error
        );

        showMessage(
          "Unable to load payment",
          "Please go back and try again."
        );
      } finally {
        setLoading(false);
      }
    }, [
      loadRestaurant,
      loadFixedCart,
      loadCustomPlateCart,
      loadCustomer,
    ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasFixedItems =
    fixedItems.length > 0;

  const hasCustomPlates =
    customPlates.length > 0;

  const hasAnyItems =
    hasFixedItems ||
    hasCustomPlates;

    const isCustomPlate = orderMode === "custom_plate";

  const fixedSubtotal =
    useMemo(() => {
      return fixedItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.price || 0
          ) *
            Number(
              item.quantity || 0
            ),
        0
      );
    }, [fixedItems]);

  const customSubtotal =
    useMemo(() => {
      return customPlates.reduce(
        (
          total,
          plate
        ) => {
          const plateTotal =
            plate.items.reduce(
              (
                plateSum,
                item
              ) =>
                plateSum +
                Number(
                  item.amount || 0
                ),
              0
            );

          return (
            total +
            plateTotal
          );
        },
        0
      );
    }, [customPlates]);

  const foodSubtotal =
    fixedSubtotal +
    customSubtotal;

  const serviceFee = 0;

  const totalAmount =
    foodSubtotal +
    serviceFee;

  const fixedItemCount =
    useMemo(() => {
      return fixedItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.quantity || 0
          ),
        0
      );
    }, [fixedItems]);

  const customComponentCount =
    useMemo(() => {
      return customPlates.reduce(
        (
          total,
          plate
        ) =>
          total +
          plate.items.length,
        0
      );
    }, [customPlates]);

  const totalItemCount =
    fixedItemCount +
    customComponentCount;

  const orderModeLabel =
    hasFixedItems &&
    hasCustomPlates
      ? "Fixed Food + Prepare My Own Plate"
      : hasCustomPlates
        ? "Prepare My Own Plate"
        : "Fixed Plate";

const openSchedulePicker = () => {
  const minimumTime =
    getMinimumScheduledDate();

  if (!scheduledFor) {
    setScheduledFor(
      minimumTime
    );
  }

  if (Platform.OS !== "web") {
    setShowDatePicker(true);
  }
};

const handleWebDateChange = (
  event: ChangeEvent<HTMLInputElement>
) => {
  const value =
    event.target.value;

  if (!value) {
    return;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return;
  }

  const current =
    scheduledFor ??
    getMinimumScheduledDate();

  const updated =
    new Date(current);

  updated.setFullYear(
    year
  );

  updated.setMonth(
    month - 1
  );

  updated.setDate(
    day
  );

  setScheduledFor(
    updated
  );
};

const handleWebTimeChange = (
  event: ChangeEvent<HTMLInputElement>
) => {
  const value =
    event.target.value;

  if (!value) {
    return;
  }

  const [
    hours,
    minutes,
  ] = value
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return;
  }

  const current =
    scheduledFor ??
    getMinimumScheduledDate();

  const updated =
    new Date(current);

  updated.setHours(
    hours,
    minutes,
    0,
    0
  );

  setScheduledFor(
    updated
  );
};

const handleNativeDateChange = (
  event: any,
  selectedDate?: Date
) => {
  setShowDatePicker(false);

  if (!selectedDate) {
    return;
  }

  const current =
    scheduledFor ??
    getMinimumScheduledDate();

  const updated =
    new Date(selectedDate);

  updated.setHours(
    current.getHours(),
    current.getMinutes(),
    0,
    0
  );

  setScheduledFor(
    updated
  );

  setTimeout(() => {
    setShowTimePicker(true);
  }, 150);
};

const handleNativeTimeChange = (
  event: any,
  selectedTime?: Date
) => {
  setShowTimePicker(false);

  if (!selectedTime) {
    return;
  }

  const current =
    scheduledFor ??
    getMinimumScheduledDate();

  const updated =
    new Date(current);

  updated.setHours(
    selectedTime.getHours(),
    selectedTime.getMinutes(),
    0,
    0
  );

  setScheduledFor(
    updated
  );
};

  const validatePayment =
    () => {
      if (!restaurant) {
        showMessage(
          "Restaurant unavailable",
          "The restaurant could not be found."
        );

        return false;
      }

      if (
        restaurant.status !==
        "active"
      ) {
        showMessage(
          "Restaurant unavailable",
          "This restaurant is currently unavailable."
        );

        return false;
      }

      if (
        !restaurant.is_open
      ) {
        showMessage(
          "Restaurant is closed",
          "Please try again when the restaurant is open."
        );

        return false;
      }

      if (
        !restaurant.accepts_momo
      ) {
        showMessage(
          "MoMo unavailable",
          "This restaurant is not accepting MoMo payments."
        );

        return false;
      }

      if (
        !restaurant.momo_provider ||
        !restaurant.momo_number
      ) {
        showMessage(
          "MoMo account unavailable",
          "The restaurant has not added its MoMo payment details yet."
        );

        return false;
      }

      if (!hasAnyItems) {
        showMessage(
          "Cart is empty",
          "Please add food before making payment."
        );

        return false;
      }

      const invalidFixedItem =
        fixedItems.find(
          (item) =>
            !Number.isFinite(
              Number(item.price)
            ) ||
            Number(item.price) <
              0 ||
            Number(item.quantity) <=
              0
        );

      if (
        invalidFixedItem
      ) {
        showMessage(
          "Invalid food item",
          `There is an invalid amount or quantity for ${invalidFixedItem.name}.`
        );

        return false;
      }

      for (
        let plateIndex = 0;
        plateIndex <
        customPlates.length;
        plateIndex++
      ) {
        const plate =
          customPlates[
            plateIndex
          ];

        if (
          !plate.items.length
        ) {
          showMessage(
            "Empty custom plate",
            `Custom Plate ${plateIndex + 1} has no selected food components.`
          );

          return false;
        }

        for (
          const item of plate.items
        ) {
          const amount =
            Number(
              item.amount
            );

          if (
            !Number.isFinite(
              amount
            ) ||
            amount <= 0
          ) {
            showMessage(
              "Invalid amount",
              `Please enter a valid amount for ${item.name} in Custom Plate ${plateIndex + 1}.`
            );

            return false;
          }
        }
      }
      
      if (orderType === "scheduled") {
  if (!scheduledFor) {
    showMessage(
      "Schedule required",
      "Please select the date and time for your order."
    );

    return false;
  }

  const minimumTime =
    getMinimumScheduledDate();

  if (
    scheduledFor.getTime() <
    minimumTime.getTime()
  ) {
    showMessage(
      "Invalid schedule",
      "Please choose a time at least 5 minutes from now."
    );

    return false;
  }
}
      if (
        !customerName.trim()
      ) {
        showMessage(
          "Customer name required",
          "Please enter your name."
        );

        return false;
      }

      if (
        !customerPhone.trim()
      ) {
        showMessage(
          "Phone number required",
          "Please enter your phone number."
        );

        return false;
      }

      if (
        !momoProvider.trim()
      ) {
        showMessage(
          "MoMo network required",
          "Please select or enter your MoMo network."
        );

        return false;
      }

      if (
        !momoName.trim()
      ) {
        showMessage(
          "MoMo name required",
          "Enter the name registered on your MoMo account."
        );

        return false;
      }

      if (
        !momoNumber.trim()
      ) {
        showMessage(
          "MoMo number required",
          "Enter the MoMo number you used to make the payment."
        );

        return false;
      }

      if (
        momoNumber.trim()
          .length < 9
      ) {
        showMessage(
          "Invalid MoMo number",
          "Please enter a valid MoMo number."
        );

        return false;
      }

      if (
        !Number.isFinite(
          totalAmount
        ) ||
        totalAmount <= 0
      ) {
        showMessage(
          "Invalid amount",
          "The order amount must be greater than zero."
        );

        return false;
      }

      return true;
    };

  const submitPayment =
    async () => {
      if (paying) {
        return;
      }

      if (
        !validatePayment()
      ) {
        return;
      }

      if (!restaurant) {
        return;
      }

      try {
        setPaying(true);

        const {
          data: {
            user,
          },
          error:
            authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          showMessage(
            "Login required",
            "Please log in before placing your order."
          );

          return;
        }

        const orderNumber =
          createOrderNumber();

        const paymentReference =
          createPaymentReference();

       const customerNoteParts = [
  `Order Mode: ${orderModeLabel}`,

  `Order Type: ${
    orderType === "scheduled"
      ? "Scheduled"
      : "Immediate"
  }`,
];

if (
  orderType === "scheduled" &&
  scheduledFor
) {
  customerNoteParts.push(
    `Scheduled For: ${scheduledFor.toLocaleString()}`
  );
}

        if (
          paymentNote.trim()
        ) {
          customerNoteParts.push(
            paymentNote.trim()
          );
        }

        const {
          data: order,
          error:
            orderError,
        } =
          await (supabase as any)
            .from(
              "food_orders"
            )
           .insert({
  order_number:
    orderNumber,

  customer_id:
    user.id,

  restaurant_id:
    restaurant.id,

  customer_name:
    customerName.trim(),

  customer_phone:
    customerPhone.trim(),

  food_subtotal:
    foodSubtotal,

  service_fee:
    0,

  total_amount:
    totalAmount,

  payment_status:
    "pending",

  order_status:
    "pending_payment",

  order_type:
    orderType,

  scheduled_for:
    orderType === "scheduled" &&
    scheduledFor
      ? scheduledFor.toISOString()
      : null,

  customer_note:
    customerNoteParts.join(
      "\n"
    ),
})
          
            .select(
              "id"
            )
            .single();

        if (orderError) {
          console.error(
            "Create food order error:",
            orderError
          );

          throw orderError;
        }

        if (!order) {
          throw new Error(
            "Order was not created."
          );
        }

        const orderItems: any[] =
          [];

        for (
          const item of fixedItems
        ) {
          const quantity =
            Math.max(
              1,
              Number(
                item.quantity || 1
              )
            );

          const unitPrice =
            Number(
              item.price || 0
            );

          orderItems.push({
            order_id:
              order.id,

            menu_item_id:
              item.menuItemId,

            item_name:
              item.name,

            item_description:
              item.description,

            quantity,

            unit_price:
              unitPrice,

            total_price:
              unitPrice *
              quantity,

            plate_group:
              "Fixed Food",
          });
        }

        for (
          let plateIndex = 0;
          plateIndex <
          customPlates.length;
          plateIndex++
        ) {
          const plate =
            customPlates[
              plateIndex
            ];

          const plateGroup =
            `Custom Plate ${plateIndex + 1}`;

          for (
            const item of plate.items
          ) {
            const unitPrice =
              Number(
                item.amount || 0
              );

            orderItems.push({
              order_id:
                order.id,

              menu_item_id:
                item.menuItemId,

              item_name:
                item.name,

              item_description:
                item.description,

              quantity: 1,

              unit_price:
                unitPrice,

              total_price:
                unitPrice,

              plate_group:
                plateGroup,
            });
          }
        }

        if (
          orderItems.length === 0
        ) {
          await supabase
            .from(
              "food_orders"
            )
            .delete()
            .eq(
              "id",
              order.id
            );

          throw new Error(
            "No order items were created."
          );
        }

        const {
          error:
            itemsError,
        } =
          await (supabase as any)
            .from(
              "food_order_items"
            )
            .insert(
              orderItems
            );

        if (itemsError) {
          console.error(
            "Create food order items error:",
            itemsError
          );

          await supabase
            .from(
              "food_orders"
            )
            .delete()
            .eq(
              "id",
              order.id
            );

          throw itemsError;
        }

       const paymentNoteParts =
  [
    `Order Mode: ${orderModeLabel}`,


    `Restaurant MoMo Number: ${
      restaurant.momo_number || "Not provided"
    }`,

    `Restaurant MoMo Network: ${
      restaurant.momo_provider || "Not provided"
    }`,

    `Customer MoMo Name: ${momoName.trim()}`,

    `Customer MoMo Number: ${momoNumber.trim()}`,
  ];

        if (
          momoProvider.trim()
        ) {
          paymentNoteParts.push(
            `MoMo Network: ${momoProvider.trim()}`
          );
        }

        if (
          hasCustomPlates
        ) {
          paymentNoteParts.push(
            `Custom Plates: ${customPlates.length}`
          );
        }

        if (
          hasFixedItems
        ) {
          paymentNoteParts.push(
            `Fixed Food Items: ${fixedItemCount}`
          );
        }

        if (
          paymentNote.trim()
        ) {
          paymentNoteParts.push(
            `Customer Note: ${paymentNote.trim()}`
          );
        }

        const {
          error:
            paymentError,
        } =
          await (supabase as any)
            .from(
              "food_payments"
            )
            .insert({
              order_id:
                order.id,

              customer_id:
                user.id,

              restaurant_id:
                restaurant.id,

              payment_reference:
                paymentReference,

              amount:
                totalAmount,

              payment_method:
                "momo",

              momo_provider:
                momoProvider.trim(),
                momo_account_name:
               momoName.trim(),

              momo_number:
                momoNumber.trim(),

              status:
                "pending",

              payment_note:
                paymentNoteParts.join(
                  "\n"
                ),
            });

        if (paymentError) {
          console.error(
            "Create food payment error:",
            paymentError
          );

          await supabase
            .from(
              "food_orders"
            )
            .delete()
            .eq(
              "id",
              order.id
            );

          throw paymentError;
        }

        await Promise.all([
          AsyncStorage.removeItem(
            CART_STORAGE_KEY
          ),

          AsyncStorage.removeItem(
            CUSTOM_PLATE_STORAGE_KEY
          ),
        ]);

        let successMessage =
          `Your order has been sent to ${restaurant.name}.\n\n`;

        successMessage +=
          `Total: ${formatMoney(totalAmount)}\n\n`;

        successMessage +=
          "The restaurant will check its MoMo account and approve the payment before preparing your food.";

        showMessage(
          "Payment Pending",
          successMessage
        );

        router.back();
      } catch (
        error: any
      ) {
        console.error(
          "Payment submission error:",
          error
        );

        showMessage(
          "Payment failed",
          error?.message ||
            "We could not create your order. Please try again."
        );
      } finally {
        setPaying(false);
      }
    };
    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading payment...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (!restaurant) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#888" />

            <Text style={styles.emptyTitle}>
              Restaurant not available
            </Text>

            <Text style={styles.emptyText}>
              This restaurant could not be loaded.
            </Text>

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    const isCustomOnly =
      isCustomPlate && !hasFixedItems && hasCustomPlates;

    const isMixedOrder =
      hasFixedItems && hasCustomPlates;

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerBackButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color="#111"
              />
            </Pressable>

            <Text style={styles.headerTitle}>
              Payment
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.restaurantCard}>
              {restaurant.logo_url ? (
                <Image
                  source={{ uri: restaurant.logo_url }}
                  style={styles.restaurantLogo}
                />
              ) : (
                <View style={styles.restaurantLogoPlaceholder}>
                  <Ionicons
                    name="restaurant"
                    size={28}
                    color="#777"
                  />
                </View>
              )}

              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>
                  {restaurant.name}
                </Text>

                {!!restaurant.address && (
                  <Text
                    style={styles.restaurantAddress}
                    numberOfLines={2}
                  >
                    {restaurant.address}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.modeCard}>
              <View style={styles.modeIconContainer}>
                <Ionicons
                  name={
                    isMixedOrder
                      ? "layers-outline"
                      : isCustomOnly
                      ? "create-outline"
                      : "restaurant-outline"
                  }
                  size={25}
                  color="#111"
                />
              </View>

              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>
                  {orderModeLabel}
                </Text>

                {isMixedOrder ? (
                  <Text style={styles.modeDescription}>
                    Your fixed foods and prepared custom plates
                    will be paid for together in one order.
                  </Text>
                ) : isCustomOnly ? (
                  <Text style={styles.modeDescription}>
                    Your selected food components and
                    customer-entered amounts will be sent to
                    the restaurant together.
                  </Text>
                ) : (
                  <Text style={styles.modeDescription}>
                    Your selected fixed-price foods will be sent
                    to the restaurant for preparation.
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Restaurant Payment Account
              </Text>

              <View style={styles.momoCard}>
                <View style={styles.momoIcon}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={24}
                    color="#111"
                  />
                </View>

                <View style={styles.momoInfo}>
                  <Text style={styles.momoProvider}>
                    {restaurant.momo_provider || "MoMo"}
                  </Text>

                  {!!restaurant.momo_number && (
                    <Text style={styles.momoNumber}>
                      {restaurant.momo_number}
                    </Text>
                  )}

                  
                </View>
              </View>

              <Text style={styles.paymentInstruction}>
                Send the exact total shown below to this restaurant
                MoMo account, then tap "I Have Paid".
              </Text>
            </View>
            
            <View style={styles.section}>
  <Text style={styles.sectionTitle}>
    When Should We Prepare Your Order?
  </Text>

  <View style={styles.orderTypeContainer}>
    <Pressable
      style={[
        styles.orderTypeButton,
        orderType === "immediate" &&
          styles.orderTypeButtonActive,
      ]}
      onPress={() => {
        setOrderType("immediate");
        setShowDatePicker(false);
        setShowTimePicker(false);
      }}
      disabled={paying}
    >
      <Ionicons
        name="flash-outline"
        size={22}
        color={
          orderType === "immediate"
            ? "#fff"
            : "#111"
        }
      />

      <View style={styles.orderTypeContent}>
        <Text
          style={[
            styles.orderTypeTitle,
            orderType === "immediate" &&
              styles.orderTypeTitleActive,
          ]}
        >
          Order Now
        </Text>

        <Text
          style={[
            styles.orderTypeDescription,
            orderType === "immediate" &&
              styles.orderTypeDescriptionActive,
          ]}
        >
          Restaurant prepares your order as soon as possible.
        </Text>
      </View>
    </Pressable>

    <Pressable
      style={[
        styles.orderTypeButton,
        orderType === "scheduled" &&
          styles.orderTypeButtonActive,
      ]}
      onPress={() => {
        setOrderType("scheduled");
        openSchedulePicker();
      }}
      disabled={paying}
    >
      <Ionicons
        name="calendar-outline"
        size={22}
        color={
          orderType === "scheduled"
            ? "#fff"
            : "#111"
        }
      />

      <View style={styles.orderTypeContent}>
        <Text
          style={[
            styles.orderTypeTitle,
            orderType === "scheduled" &&
              styles.orderTypeTitleActive,
          ]}
        >
          Schedule for Later
        </Text>

        <Text
          style={[
            styles.orderTypeDescription,
            orderType === "scheduled" &&
              styles.orderTypeDescriptionActive,
          ]}
        >
          Choose when you want the restaurant to prepare it.
        </Text>
      </View>
    </Pressable>
  </View>

  {orderType === "scheduled" && (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <Ionicons
          name="calendar-outline"
          size={21}
          color="#111"
        />

        <Text style={styles.scheduleHeaderText}>
          Select Date & Time
        </Text>
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.webScheduleContainer}>
          <View style={styles.webScheduleField}>
            <Text style={styles.webScheduleLabel}>
              Date
            </Text>

            <input
              type="date"
              value={formatDateInputValue(
                scheduledFor
              )}
              min={formatDateInputValue(
                new Date()
              )}
              onChange={
                handleWebDateChange
              }
              disabled={paying}
              style={
                styles.webScheduleInput as any
              }
            />
          </View>

          <View style={styles.webScheduleField}>
            <Text style={styles.webScheduleLabel}>
              Time
            </Text>

            <input
              type="time"
              value={formatTimeInputValue(
                scheduledFor
              )}
              onChange={
                handleWebTimeChange
              }
              disabled={paying}
              style={
                styles.webScheduleInput as any
              }
            />
          </View>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.schedulePickerButton}
            onPress={() =>
              setShowDatePicker(true)
            }
            disabled={paying}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#111"
            />

            <View style={styles.schedulePickerContent}>
              <Text style={styles.schedulePickerLabel}>
                Date
              </Text>

              <Text style={styles.schedulePickerValue}>
                {scheduledFor
                  ? scheduledFor.toLocaleDateString(
                      undefined,
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )
                  : "Select date"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#777"
            />
          </Pressable>

          <Pressable
            style={styles.schedulePickerButton}
            onPress={() =>
              setShowTimePicker(true)
            }
            disabled={paying}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color="#111"
            />

            <View style={styles.schedulePickerContent}>
              <Text style={styles.schedulePickerLabel}>
                Time
              </Text>

              <Text style={styles.schedulePickerValue}>
                {scheduledFor
                  ? scheduledFor.toLocaleTimeString(
                      undefined,
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "Select time"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#777"
            />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={
                scheduledFor ??
                getMinimumScheduledDate()
              }
              mode="date"
              minimumDate={
                new Date()
              }
              onChange={
                handleNativeDateChange
              }
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={
                scheduledFor ??
                getMinimumScheduledDate()
              }
              mode="time"
              onChange={
                handleNativeTimeChange
              }
            />
          )}
        </>
      )}

      {scheduledFor && (
        <View style={styles.selectedSchedule}>
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#15803d"
          />

          <Text style={styles.selectedScheduleText}>
            Scheduled for{" "}
            {scheduledFor.toLocaleString(
              undefined,
              {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </Text>
        </View>
      )}

      <Text style={styles.scheduleHint}>
        Scheduled orders must be at least 5 minutes from the
        current time.
      </Text>
    </View>
  )}
</View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Your Details
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Full Name
                </Text>

                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone Number
                </Text>

                <TextInput
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>
    Your MoMo Account Name
  </Text>

  <TextInput
    value={momoName}
    onChangeText={setMomoName}
    placeholder="Name registered on your MoMo account"
    placeholderTextColor="#999"
    style={styles.input}
    autoCapitalize="words"
  />
</View>

<View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>
    Your MoMo Number
  </Text>

  <TextInput
    value={momoNumber}
    onChangeText={setMomoNumber}
    placeholder="Number used to make payment"
    placeholderTextColor="#999"
    style={styles.input}
    keyboardType="phone-pad"
  />
</View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  MoMo Provider
                </Text>

                <TextInput
                  value={momoProvider}
                  onChangeText={setMomoProvider}
                  placeholder="MTN, Telecel, AirtelTigo..."
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Payment Note
                </Text>

                <TextInput
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder="Optional payment note"
                  placeholderTextColor="#999"
                  style={[
                    styles.input,
                    styles.multilineInput,
                  ]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.summaryHeader}>
                <Text style={styles.sectionTitle}>
                  Order Summary
                </Text>

                <Text style={styles.itemCountText}>
                  {totalItemCount} item
                  {totalItemCount === 1 ? "" : "s"}
                </Text>
              </View>

              {hasFixedItems && (
                <View style={styles.orderGroup}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name="restaurant-outline"
                        size={19}
                        color="#111"
                      />

                      <Text style={styles.groupTitle}>
                        Fixed Food
                      </Text>
                    </View>

                    <Text style={styles.groupTotal}>
                      {formatMoney(fixedSubtotal)}
                    </Text>
                  </View>

                  {fixedItems.map((item) => (
                    <View
                      key={`fixed-${item.menuItemId}`}
                      style={styles.orderItem}
                    >
                      <View style={styles.orderItemInfo}>
                        <Text
                          style={styles.orderItemName}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>

                        <Text style={styles.orderItemQuantity}>
                          Qty: {item.quantity}
                        </Text>
                      </View>

                      <Text style={styles.orderItemPrice}>
                        {formatMoney(
                          item.price * item.quantity
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {hasCustomPlates &&
                customPlates.map((plate, index) => {
                  const plateTotal = plate.items.reduce(
                    (sum, item) =>
                      sum + Math.max(0, Number(item.amount) || 0),
                    0
                  );

                  return (
                    <View
                      key={plate.plateId}
                      style={styles.orderGroup}
                    >
                      <View style={styles.groupHeader}>
                        <View style={styles.groupHeaderLeft}>
                          <Ionicons
                            name="create-outline"
                            size={19}
                            color="#111"
                          />

                          <Text style={styles.groupTitle}>
                            Custom Plate{" "}
                            {plate.plateNumber || index + 1}
                          </Text>
                        </View>

                        <Text style={styles.groupTotal}>
                          {formatMoney(plateTotal)}
                        </Text>
                      </View>

                      {plate.items.map((item) => {
                        const amount = Math.max(
                          0,
                          Number(item.amount) || 0
                        );

                        return (
                          <View
                            key={`${plate.plateId}-${item.menuItemId}`}
                            style={styles.orderItem}
                          >
                            <View style={styles.orderItemInfo}>
                              <Text
                                style={styles.orderItemName}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>

                              <Text
                                style={styles.customAmountLabel}
                              >
                                Customer-entered amount
                              </Text>
                            </View>

                            <Text style={styles.orderItemPrice}>
                              {formatMoney(amount)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Food subtotal
                </Text>

                <Text style={styles.summaryValue}>
                  {formatMoney(foodSubtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Service fee
                </Text>

                <Text style={styles.summaryValue}>
                  {formatMoney(serviceFee)}
                </Text>
              </View>

              <View style={styles.totalDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Total to Pay
                </Text>

                <Text style={styles.totalValue}>
                  {formatMoney(totalAmount)}
                </Text>
              </View>
            </View>

            {(hasCustomPlates || isCustomPlate) && (
              <View style={styles.customNotice}>
                <View style={styles.customNoticeIcon}>
                  <Ionicons
                    name="information-circle-outline"
                    size={23}
                    color="#111"
                  />
                </View>

                <View style={styles.customNoticeContent}>
                  <Text style={styles.customNoticeTitle}>
                    Prepare My Own Plate
                  </Text>

                  <Text style={styles.customNoticeText}>
                    The amounts shown for custom components are
                    the amounts you entered. Nasara does not
                    replace them with the restaurant's stored
                    fixed menu prices.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.pendingCard}>
              <View style={styles.pendingIcon}>
                <Ionicons
                  name="time-outline"
                  size={25}
                  color="#111"
                />
              </View>

              <View style={styles.pendingContent}>
                <Text style={styles.pendingTitle}>
                  What happens after payment?
                </Text>

                <Text style={styles.pendingStep}>
                  1. Send the exact total to the restaurant's MoMo
                  account.
                </Text>

                <Text style={styles.pendingStep}>
                  2. Tap "I Have Paid".
                </Text>

                <Text style={styles.pendingStep}>
                  3. The restaurant checks the payment and order
                  details.
                </Text>

                <Text style={styles.pendingStep}>
                  4. The restaurant accepts and prepares your
                  order, or rejects it if necessary.
                </Text>
              </View>
            </View>

            <View style={styles.warningCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#111"
              />

              <Text style={styles.warningText}>
                Only send payment to the MoMo account displayed
                above. Make sure the amount is exactly{" "}
                {formatMoney(totalAmount)}.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <View style={styles.bottomTotalContainer}>
              <Text style={styles.bottomTotalLabel}>
                Total
              </Text>

              <Text style={styles.bottomTotal}>
                {formatMoney(totalAmount)}
              </Text>
            </View>

            <Pressable
              style={[
                styles.payButton,
                (paying || !hasAnyItems) &&
                  styles.payButtonDisabled,
              ]}
              onPress={submitPayment}
              disabled={paying || !hasAnyItems}
            >
              {paying ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#fff"
                  />

                  <Text style={styles.payButtonText}>
                    I Have Paid
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#666",
    textAlign: "center",
  },

  backButton: {
    marginTop: 22,
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
  },

  backButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },

  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },

  restaurantCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    borderRadius: 16,
    backgroundColor: "#fafafa",
  },

  restaurantLogo: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#eee",
  },

  restaurantLogoPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },

  restaurantInfo: {
    flex: 1,
    marginLeft: 13,
  },

  restaurantName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },

  restaurantAddress: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#666",
  },

  modeCard: {
    flexDirection: "row",
    marginTop: 14,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#f4f4f4",
  },

  modeIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  modeContent: {
    flex: 1,
    marginLeft: 12,
  },

  modeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },

  modeDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
  },

  section: {
    marginTop: 22,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    marginBottom: 11,
  },

  momoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 14,
    backgroundColor: "#fff",
  },

  momoIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f1f1",
  },

  momoInfo: {
    flex: 1,
    marginLeft: 12,
  },

  momoProvider: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },

  momoNumber: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },

  momoAccountName: {
    marginTop: 3,
    fontSize: 13,
    color: "#666",
  },

  paymentInstruction: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
  },

  inputGroup: {
    marginBottom: 14,
  },

  inputLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },

  multilineInput: {
    minHeight: 90,
    paddingTop: 13,
    paddingBottom: 13,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemCountText: {
    marginBottom: 11,
    fontSize: 13,
    color: "#777",
  },

  orderGroup: {
    marginBottom: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 14,
    backgroundColor: "#fff",
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  groupTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },

  groupTotal: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },

  orderItemInfo: {
    flex: 1,
    paddingRight: 12,
  },

  orderItemName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    color: "#222",
  },

  orderItemQuantity: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
  },

  customAmountLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#777",
  },

  orderItemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  summaryDivider: {
    height: 1,
    marginTop: 5,
    marginBottom: 13,
    backgroundColor: "#e7e7e7",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },

  totalDivider: {
    height: 1,
    marginTop: 5,
    marginBottom: 13,
    backgroundColor: "#ddd",
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },

  customNotice: {
    flexDirection: "row",
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f4f4f4",
  },

  customNoticeIcon: {
    width: 30,
    alignItems: "center",
    paddingTop: 1,
  },

  customNoticeContent: {
    flex: 1,
    marginLeft: 7,
  },

  customNoticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  customNoticeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
  },

  pendingCard: {
    flexDirection: "row",
    marginTop: 16,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#f7f7f7",
  },

  pendingIcon: {
    width: 36,
    alignItems: "center",
    paddingTop: 1,
  },

  pendingContent: {
    flex: 1,
    marginLeft: 4,
  },

  pendingTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },

  pendingStep: {
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#555",
  },

  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f1f1f1",
  },

  warningText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 12,
    lineHeight: 18,
    color: "#555",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 22 : 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },

  bottomTotalContainer: {
    flex: 1,
    marginRight: 12,
  },

  bottomTotalLabel: {
    fontSize: 12,
    color: "#777",
  },

  bottomTotal: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },

  payButton: {
    minWidth: 155,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },

  payButtonDisabled: {
    opacity: 0.5,
  },

  payButtonText: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  orderTypeContainer: {
  gap: 10,
},

orderTypeButton: {
  flexDirection: "row",
  alignItems: "center",
  padding: 14,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 13,
  backgroundColor: "#fff",
},

orderTypeButtonActive: {
  backgroundColor: "#111",
  borderColor: "#111",
},

orderTypeContent: {
  flex: 1,
  marginLeft: 11,
},

orderTypeTitle: {
  fontSize: 15,
  fontWeight: "800",
  color: "#111",
},

orderTypeTitleActive: {
  color: "#fff",
},

orderTypeDescription: {
  marginTop: 3,
  fontSize: 12,
  lineHeight: 17,
  color: "#777",
},

orderTypeDescriptionActive: {
  color: "#ddd",
},

scheduleCard: {
  marginTop: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: "#e1e1e1",
  borderRadius: 14,
  backgroundColor: "#fafafa",
},

scheduleHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

scheduleHeaderText: {
  marginLeft: 8,
  fontSize: 15,
  fontWeight: "800",
  color: "#111",
},

webScheduleContainer: {
  gap: 12,
},

webScheduleField: {
  width: "100%",
},

webScheduleLabel: {
  marginBottom: 6,
  fontSize: 13,
  fontWeight: "700",
  color: "#333",
},

webScheduleInput: {
  width: "100%",
  minHeight: 48,
  paddingLeft: 12,
  paddingRight: 12,
  borderWidth: 1,
  borderColor: "#d5d5d5",
  borderRadius: 10,
  backgroundColor: "#fff",
  color: "#111",
  fontSize: 15,
  boxSizing: "border-box",
  outlineStyle: "none",
} as any,

schedulePickerButton: {
  flexDirection: "row",
  alignItems: "center",
  padding: 12,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 11,
  backgroundColor: "#fff",
},

schedulePickerContent: {
  flex: 1,
  marginLeft: 10,
},

schedulePickerLabel: {
  fontSize: 11,
  color: "#777",
},

schedulePickerValue: {
  marginTop: 3,
  fontSize: 15,
  fontWeight: "700",
  color: "#111",
},

selectedSchedule: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 2,
  padding: 10,
  borderRadius: 9,
  backgroundColor: "#dcfce7",
},

selectedScheduleText: {
  flex: 1,
  marginLeft: 7,
  fontSize: 13,
  fontWeight: "700",
  color: "#166534",
},

scheduleHint: {
  marginTop: 9,
  fontSize: 12,
  lineHeight: 17,
  color: "#777",
},
});