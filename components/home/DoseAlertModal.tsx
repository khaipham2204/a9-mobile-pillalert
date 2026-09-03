import { Text } from "@/components/ui/text";
import { Modal, Pressable, View } from "react-native";
import { minutesOfDay, timeToMinutes } from "./helpers";
import type { Drug, TimeSlotKey } from "./types";
import { TIME_FIELDS, TIME_ICONS, TIME_LABELS } from "./types";

type DoseAlertModalProps = {
  visible: boolean;
  slotIndex: number | null;
  data: Drug[];
  /** Scheduled "HH:mm" for this slot — used to show how late the dose is. */
  scheduledTime?: string;
  onConfirm: (
    slotKey: TimeSlotKey,
    drugs: { name: string; qty: number }[],
  ) => void;
  /** "Skip" — answers the slot for today, no history entry. */
  onSkip: () => void;
  /** Tap-outside / back — hides the modal but keeps the slot unanswered. */
  onSnooze: () => void;
};

export function DoseAlertModal({
  visible,
  slotIndex,
  data,
  scheduledTime,
  onConfirm,
  onSkip,
  onSnooze,
}: DoseAlertModalProps) {
  if (slotIndex === null) return null;

  const slotKey = TIME_FIELDS[slotIndex];
  const drugs = data
    .filter((d) => d[slotKey] > 0)
    .map((d) => ({ name: d.name, qty: d[slotKey] }));

  const scheduledMin = scheduledTime ? timeToMinutes(scheduledTime) : null;
  const lateBy = scheduledMin === null ? 0 : minutesOfDay() - scheduledMin;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSnooze}
    >
      <Pressable
        onPress={onSnooze}
        className="flex-1 bg-black/80 items-center justify-center px-6"
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-blue-100 shadow-lg">
            {/* Header */}
            <View className="items-center mb-4">
              <Text className="text-4xl mb-2">{TIME_ICONS[slotIndex]}</Text>
              <Text className="text-slate-900 font-bold text-lg text-center">
                Time to take your medication!
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1">
                {TIME_LABELS[slotIndex]}
                {scheduledTime ? ` — ${scheduledTime}` : ""}
              </Text>
              {lateBy >= 2 && (
                <Text className="text-amber-400 text-xs text-center mt-1">
                  ⏰ {lateBy} min late
                </Text>
              )}
            </View>

            {/* Drug list */}
            <View className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
              {drugs.length === 0 ? (
                <Text className="text-slate-500 text-sm text-center">
                  No medications scheduled for this time slot.
                </Text>
              ) : (
                drugs.map((d, i) => (
                  <View
                    key={i}
                    className="flex-row items-center justify-between py-2 border-b border-blue-100 last:border-0"
                  >
                    <Text className="text-blue-800 font-bold text-sm flex-1">
                      {d.name}
                    </Text>
                    <View className="bg-blue-600/10 rounded-lg px-3 py-1 ml-3">
                      <Text className="text-blue-700 text-sm font-bold">
                        {d.qty} {d.qty === 1 ? "tablet" : "tablets"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onSkip}
                className="flex-1 bg-slate-100 active:bg-slate-200 rounded-xl py-3 items-center border border-slate-200"
              >
                <Text className="text-slate-700 font-bold text-sm">Skip</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirm(slotKey, drugs)}
                className="flex-2 bg-blue-600 active:bg-blue-700 rounded-xl py-3 px-6 items-center"
              >
                <Text className="text-white font-bold text-sm">✓ Taken</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
