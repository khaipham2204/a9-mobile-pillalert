import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";
import type { Device } from "react-native-ble-plx";

type BluetoothBannerProps = {
  connectedDevice: Device | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function BluetoothBanner({
  connectedDevice,
  onConnect,
  onDisconnect,
}: BluetoothBannerProps) {
  if (!connectedDevice) {
    return (
      <Pressable onPress={onConnect}>
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-4 mb-4 border border-blue-100 shadow-sm">
          <View className="rounded-xl mr-4 bg-blue-100 p-2">
            <Image
              size="lg"
              source={{
                uri: require("@/assets/images/bluetooth-solid-icon.png"),
              }}
              alt="Bluetooth"
              className="tint-blue-600"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-blue-600 mb-1 font-semibold">
              Stay connected
            </Text>
            <Text className="text-base font-bold text-slate-900 tracking-wide">
              Tap to connect your device
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onDisconnect}>
      <View className="flex-row items-center bg-blue-600 rounded-2xl px-4 py-4 mb-6 shadow-sm">
        <View className="bg-blue-500 rounded-xl p-3 mr-4 border border-blue-400">
          <Image
            size="sm"
            source={{
              uri: require("@/assets/images/bluetooth-solid-icon.png"),
            }}
            alt="Bluetooth"
            className="tint-white"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-blue-100 mb-1 font-semibold">
            Connected and ready
          </Text>
          <Text className="text-lg font-bold text-white tracking-wide">
            {connectedDevice.localName ?? connectedDevice.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
