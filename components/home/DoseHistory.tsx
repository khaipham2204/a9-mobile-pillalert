import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { Alert, Pressable, View } from "react-native";
import type { DoseRecord } from "./types";
import { TIME_FIELDS, TIME_ICONS } from "./types";

type DoseHistoryProps = {
  history: DoseRecord[];
  onClear: () => void;
};

export function DoseHistory({ history, onClear }: DoseHistoryProps) {
  if (history.length === 0) return null;

  const handleClear = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to delete all dose history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: onClear },
      ],
    );
  };

  return (
    <View className="mt-5 bg-white rounded-2xl p-4 border border-blue-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          Dose History
        </Text>
        <Pressable
          onPress={handleClear}
          className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100"
        >
          <Text className="text-blue-700 text-xs font-bold">Clear history</Text>
        </Pressable>
      </View>

      {history.slice(0, 5).map((record, i) => {
        const d = new Date(record.takenAt);
        const timeStr = format(d, "HH:mm");
        const dateStr = format(d, "MMM d, yyyy");
        const slotIdx = TIME_FIELDS.indexOf(record.slotKey);

        return (
          <View
            key={i}
            className="flex-row items-start py-3 border-b border-blue-50 last:border-0"
          >
            <Text className="text-base mr-3 mt-0.5">{TIME_ICONS[slotIdx]}</Text>
            <View className="flex-1">
              <Text className="text-slate-600 text-xs">
                {dateStr} — {timeStr}
              </Text>
              <Text className="text-slate-500 text-[11px] mt-0.5">
                {record.drugs
                  .map(
                    (d) =>
                      `${d.name} ×${d.qty} ${d.qty === 1 ? "tablet" : "tablets"}`,
                  )
                  .join(", ")}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
