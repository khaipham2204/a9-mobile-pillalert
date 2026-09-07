import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import "react-native-reanimated";

import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import "./global.css";
import { useColorScheme } from "./hooks/use-color-scheme";

import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { Dimensions, Image, View } from "react-native";
import { HapticTab } from "./components/haptic-tab";
import { IconSymbol } from "./components/ui/icon-symbol";
import { Colors, DISCLAIMER_KEY } from "./constants/theme";
import BleDevicesScreen from "./screens/ble-devices";
import CameraScreen from "./screens/camera";
import HomeScreen from "./screens/home";

import { DisclaimerModal } from "./components/home/DisclamerModel";
import { useBluetoothStore } from "./store/bluetoothStore";
import { storage } from "./store/storage";
import { RootStackParamList, TabParamList } from "./types/navigation";
import { navigationRef } from "./utils/NavigationService";

// Giữ splash native hiển thị cho tới khi ta chủ động ẩn.
// PHẢI gọi ở global scope (không await, không đặt trong component).
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const colorScheme = useColorScheme();
  const init = useBluetoothStore((s) => s.init);
  useEffect(() => init(), [init]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => !storage.getBoolean(DISCLAIMER_KEY),
  );
  const [appIsReady, setAppIsReady] = useState(false);

  const handleAgree = () => {
    storage.set(DISCLAIMER_KEY, true);
    setShowDisclaimer(false);
  };

  useEffect(() => {
    async function prepare() {
      try {
        // TODO: thay bằng logic thật: load font, init Bluetooth, check permission...
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // Ẩn splash NATIVE (icon nhỏ) ngay khi custom splash JS đã render xong,
  // không đợi tới lúc app thật sẵn sàng -> icon nhỏ chỉ lóe lên rất ngắn.
  const onCustomSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!appIsReady) {
    const { width, height } = Dimensions.get("window");
    return (
      <View
        style={{ flex: 1, backgroundColor: "#020B1C" }}
        onLayout={onCustomSplashLayout}
      >
        <Image
          // Kiểm tra kỹ đường dẫn này khớp với vị trí file thật trong project của bạn
          source={require("./assets/images/splashfull.png")}
          style={{ width, height }}
          resizeMode="stretch"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GluestackUIProvider mode="dark">
        <NavigationContainer
          ref={navigationRef}
          theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack.Navigator
            screenOptions={{
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen
              name="Tabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BleDevices"
              component={BleDevicesScreen}
              options={{
                title: "BLE Devices",
                headerStyle: { backgroundColor: "#0f172a" },
                headerTintColor: "#fff",
              }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <DisclaimerModal visible={showDisclaimer} onAgree={handleAgree} />
      </GluestackUIProvider>
    </View>
  );
}
