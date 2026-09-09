import {
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import slugify from "slugify";
import type { Drug, TimeSlotKey } from "./types";
import { TIME_FIELDS, TIME_LABELS } from "./types";

type DrugTableProps = {
  data: Drug[];
  editing: boolean;
  photos: Record<string, string>;
  notes: Record<string, string>;
  times: string[];
  onIncrement: (index: number, field: TimeSlotKey) => void;
  onDecrement: (index: number, field: TimeSlotKey) => void;
  onHeaderPress: (i: number) => void;
  onLabelPress: (label: string) => void;
};

export function DrugTable({
  data,
  editing,
  photos,
  times,
  notes,
  onIncrement,
  onDecrement,
  onHeaderPress,
  onLabelPress,
}: DrugTableProps) {
  const [popup, setPopup] = useState<{
    index: number;
    field: TimeSlotKey;
  } | null>(null);
  return (
    <View className="rounded-2xl overflow-hidden bg-white shadow-sm border border-blue-100">
      <Table className="w-full table-fixed">
        <TableHeader className="mb-[0.3rem]">
          <TableRow className={`border-b-0 bg-blue-800`}>
            <TableHead className="px-3 py-3 text-center min-h-[52px]">
              <View className="w-full h-full">
                <View className=" p-2 w-full h-full items-center justify-center">
                  <Text className="text-[11px] font-bold text-white uppercase tracking-wider ">
                    Medicine
                  </Text>
                </View>
              </View>
            </TableHead>

            {TIME_LABELS.map((label, i) => (
              <TableHead
                key={label}
                className="px-1 py-3 text-center min-h-[52px]"
              >
                <Pressable
                  onPress={() => onHeaderPress(i)}
                  className="w-full h-full"
                >
                  <View
                    className={`${editing ? "bg-amber-300" : "bg-blue-700"} rounded-lg p-2 w-full h-full items-center justify-center border border-blue-500`}
                  >
                    <Text
                      className={`${editing ? "text-amber-950" : "text-white"} text-[11px] font-bold uppercase tracking-wider`}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className="flex-col gap-1">
          {data.map((item, index) => (
            <TableRow
              key={index}
              className={`${index % 2 === 0 ? "bg-white" : "bg-blue-50/70"} border-t border-blue-100`}
            >
              <TableData className="px-3 py-2 text-center min-h-[52px]">
                <Pressable
                  onPress={() => onLabelPress(item.name)}
                  className={`${editing ? "bg-amber-300" : "bg-blue-100"} rounded-xl min-h-12 h-full w-full items-center justify-center border border-blue-200`}
                >
                  <Text className="text-slate-900 text-base font-bold">
                    {item.name}
                  </Text>
                  {(() => {
                    const slug = slugify(item.name, {
                      lower: true,
                      strict: true,
                      replacement: "-",
                    });

                    const photoExists = Boolean(photos[slug]);
                    const noteExists = Boolean(notes[slug]);

                    return (
                      <View className="flex-row items-center gap-1 mt-1">
                        {/* Photo */}
                        <MaterialIcons
                          name="photo-camera"
                          size={16}
                          color={photoExists ? "#1e3a8a" : "#94a3b8"}
                        />

                        <Text className="text-slate-400 text-xs">/</Text>

                        {/* Note */}
                        <MaterialIcons
                          name="sticky-note-2"
                          size={14}
                          color={noteExists ? "#1e3a8a" : "#94a3b8"}
                        />
                      </View>
                    );
                  })()}
                </Pressable>
              </TableData>

              {TIME_FIELDS.map((field) => (
                <TableData
                  key={field}
                  className="px-1 py-2 text-center min-h-[52px]"
                >
                  <Pressable
                    onPress={() => editing && setPopup({ index, field })}
                    disabled={!editing}
                    className={`rounded-xl w-12 h-12 items-center justify-center border ${item[field] > 0 ? "bg-blue-100 border-blue-200" : "bg-slate-100 border-slate-200"}`}
                  >
                    <Text
                      className={`${item[field] > 0 ? "text-blue-900" : "text-slate-500"} text-xl font-extrabold`}
                    >
                      {item[field]}
                    </Text>
                  </Pressable>
                </TableData>
              ))}
            </TableRow>
          ))}

          {/* Time Row */}
          <TableRow className="bg-blue-600 border-b-0 mt-[0.1rem]">
            <TableData className="px-3 py-3 min-h-[52px] text-center">
              <View className="flex-1 h-full w-full flex items-center justify-center">
                <Text className="text-white text-sm font-bold uppercase tracking-wider">
                  Time
                </Text>
              </View>
            </TableData>

            {times.map((t, i) => (
              <TableData key={i} className="px-1 py-3 min-h-[52px] text-center">
                <Pressable
                  onPress={() => onHeaderPress(i)}
                  hitSlop={8}
                  className=""
                >
                  <View
                    className={`${editing ? "bg-amber-300" : "bg-white"} rounded-lg p-2 w-full h-full items-center justify-center border border-blue-100`}
                  >
                    <Text className="text-blue-700 text-base font-bold">
                      {t}
                    </Text>
                  </View>
                </Pressable>
              </TableData>
            ))}
          </TableRow>
        </TableBody>
      </Table>

      {/* +/- Popup */}
      <Modal
        visible={popup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPopup(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setPopup(null)}
        >
          <Pressable
            className="bg-white rounded-2xl p-6 items-center gap-4 min-w-[200px] border border-blue-100 shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            {popup && (
              <>
                <Text className="text-lg font-bold text-black">
                  {data[popup.index]?.name} — {popup.field}
                </Text>
                <Text className="text-3xl font-extrabold text-blue-900">
                  {data[popup.index]?.[popup.field]}
                </Text>
                <View className="flex-row gap-6">
                  <Pressable
                    onPress={() => {
                      onDecrement(popup.index, popup.field);
                    }}
                    className="bg-rose-500 w-14 h-14 rounded-full items-center justify-center"
                  >
                    <Text className="text-white text-2xl font-bold">−</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onIncrement(popup.index, popup.field);
                    }}
                    className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center"
                  >
                    <Text className="text-white text-2xl font-bold">+</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setPopup(null)}
                  className="mt-2 px-6 py-2 bg-blue-100 rounded-lg"
                >
                  <Text className="text-blue-800 font-bold">Done</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
