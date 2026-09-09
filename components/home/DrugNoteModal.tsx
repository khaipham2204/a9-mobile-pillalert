import { Text } from "@/components/ui/text";
import { useEffect, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { MAX_NOTE_LENGTH } from "./types";

type DrugNoteModalProps = {
  visible: boolean;
  label: string;
  /** "edit" (editing mode — tap Note icon) lets the user type and save;
   * "view" (normal mode) just displays the saved note, read-only. */
  mode: "edit" | "view";
  initialValue: string;
  onSave: (text: string) => void;
  onClose: () => void;
};

export function DrugNoteModal({
  visible,
  label,
  mode,
  initialValue,
  onSave,
  onClose,
}: DrugNoteModalProps) {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    if (visible) setText(initialValue);
  }, [visible, initialValue]);

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
            <Text className="text-slate-900 font-bold text-lg text-center mb-1">
              📝 {label}
            </Text>
            <Text className="text-slate-500 text-xs text-center mb-4">
              {mode === "edit" ? "Add a short note" : "Saved note"}
            </Text>

            {mode === "edit" ? (
              <>
                <TextInput
                  value={text}
                  onChangeText={(t) => setText(t.slice(0, MAX_NOTE_LENGTH))}
                  maxLength={MAX_NOTE_LENGTH}
                  multiline
                  placeholder="Type a note…"
                  textAlignVertical="top"
                  className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-slate-900 text-sm min-h-[90px]"
                />
                <Text className="text-slate-400 text-xs text-right mt-1 mb-4">
                  {text.length}/{MAX_NOTE_LENGTH}
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={onClose}
                    className="flex-1 bg-slate-100 active:bg-slate-200 rounded-xl py-3 items-center border border-slate-200"
                  >
                    <Text className="text-slate-700 font-bold text-sm">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onSave(text)}
                    className="flex-1 bg-blue-600 active:bg-blue-700 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-bold text-sm">Save</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100 min-h-[90px] justify-center mb-4">
                  <Text className="text-slate-900 text-sm">
                    {initialValue || "No note saved yet."}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  className="bg-blue-100 rounded-xl py-3 items-center"
                >
                  <Text className="text-blue-800 font-bold text-sm">
                    Close
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
