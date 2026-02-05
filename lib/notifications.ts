
export const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string
) => {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title,
        body,
      }),
    });
  } catch (error) {
    console.log("Push notification error:", error);
  }
};