import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN = "access_token";

const REFRESH_TOKEN = "refresh_token";

export const saveTokens = async (
  access: string,
  refresh: string
) => {
  await SecureStore.setItemAsync(
    ACCESS_TOKEN,
    access
  );

  await SecureStore.setItemAsync(
    REFRESH_TOKEN,
    refresh
  );
};

export const getAccessToken = () =>
  SecureStore.getItemAsync(ACCESS_TOKEN);

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(
    ACCESS_TOKEN
  );

  await SecureStore.deleteItemAsync(
    REFRESH_TOKEN
  );
};