import { Text } from "@/components/ui/text";
import { Modal, Pressable, View } from "react-native";

type BluetoothRequiredModalProps = {
  visible: boolean;
  /** "Connect Bluetooth" — navigates to the device list. */
  onConnect: () => void;
  /** "Undo changes" — restores drug quantities to before Edit, exits editing. */
  onRevert: () => void;
  /** Tap-outside / back — hides the popup, keeps editing untouched. */
  onClose: () => void;
};

export function BluetoothRequiredModal({
  visible,
  onConnect,
  onRevert,
  onClose,
}: BluetoothRequiredModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 items-center justify-center px-6"
      >
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm">
          <View className="bg-white rounded-3xl p-6 border border-blue-100 shadow-lg">
            <View className="items-center mb-4">
              <Text className="text-4xl mb-2">🔌</Text>
              <Text className="text-slate-900 font-bold text-lg text-center">
                Bluetooth not connected
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1">
                Connect your device to save the new drug quantities, or undo
                the changes you just made.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={onRevert}
                className="flex-1 bg-slate-100 active:bg-slate-200 rounded-xl py-3 items-center border border-slate-200"
              >
                <Text className="text-slate-700 font-bold text-sm">
                  Undo changes
                </Text>
              </Pressable>
              <Pressable
                onPress={onConnect}
                className="flex-1 bg-blue-600 active:bg-blue-700 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-bold text-sm">
                  Connect Bluetooth
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
