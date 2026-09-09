import { Text } from "@/components/ui/text";
import { Modal, Pressable, View } from "react-native";

type LabelPickerModalProps = {
  visible: boolean;
  label: string;
  onPressCamera: () => void;
  onPressNote: () => void;
  onClose: () => void;
};

/** Chooser popup shown when tapping a drug's label — pick photo or note. */
export function LabelPickerModal({
  visible,
  label,
  onPressCamera,
  onPressNote,
  onClose,
}: LabelPickerModalProps) {
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
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-xs">
          <View className="bg-white rounded-3xl p-6 border border-blue-100 shadow-lg items-center">
            <Text className="text-slate-900 font-bold text-base text-center mb-5">
              {label}
            </Text>
            <View className="flex-row gap-8">
              <Pressable onPress={onPressCamera} className="items-center gap-2">
                <View className="bg-blue-100 w-16 h-16 rounded-2xl items-center justify-center border border-blue-200">
                  <Text className="text-3xl">📷</Text>
                </View>
                <Text className="text-slate-600 text-xs font-bold">Photo</Text>
              </Pressable>
              <Pressable onPress={onPressNote} className="items-center gap-2">
                <View className="bg-blue-100 w-16 h-16 rounded-2xl items-center justify-center border border-blue-200">
                  <Text className="text-3xl">📝</Text>
                </View>
                <Text className="text-slate-600 text-xs font-bold">Note</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
