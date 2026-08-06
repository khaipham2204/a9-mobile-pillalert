import { BluetoothBanner } from "@/components/home/BluetoothBanner";
import { DoseAlertModal } from "@/components/home/DoseAlertModal";
import { DoseHistory } from "@/components/home/DoseHistory";
import { DrugTable } from "@/components/home/DrugTable";
import { TimePickerModal } from "@/components/home/TimePickerModal";
import {
  setupNotificationHandler,
  syncSlotNotifications,
} from "@/components/home/helpers";
import {
  DOSE_CATCH_UP_MINUTES,
  DOSE_CHECK_INTERVAL_MS,
} from "@/components/home/types";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useBluetoothStore } from "@/store/bluetoothStore";
import { useHomeStore } from "@/store/homeStore";
import type { RootStackParamList, TabParamList } from "@/types/navigation";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import {
  AppState,
  Modal,
  Pressable,
  Image as RNImage,
  ScrollView,
  View,
} from "react-native";
import slugify from "slugify";

setupNotificationHandler();

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, "Home">>();
  const { connectedDevice, disconnectDevice } = useBluetoothStore();

  const {
    data,
    savedData,
    photos,
    times,
    editing,
    previewUri,
    editingTimeIndex,
    doseAlertIndex,
    setEditing,
    increment,
    handleSave,
    handleHeaderPress,
    setPreviewUri,
    setEditingTimeIndex,
    setTimes,
    setPhoto,
    handleDoseConfirm,
    handleDoseSkip,
    snoozeDoseAlert,
    openDoseAlert,
    checkDoseAlerts,
    history,
    clearHistory,
  } = useHomeStore();

  // ── Notification → modal ──────────────────────────────────────────────────
  // Two paths, because a notification can reach us in two different ways.

  // 1. Tapped. The hook also covers the cold-start case the plain listener
  //    misses: when the app was killed, the tap is delivered before any
  //    listener can mount.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse) return;
    // The tap is remembered *forever*, so ignore stale ones — otherwise
    // tomorrow's launch would replay yesterday's notification.
    const firedAt = lastResponse.notification.date;
    const ageMinutes =
      typeof firedAt === "number" ? (Date.now() - firedAt) / 60_000 : Infinity;
    if (ageMinutes > DOSE_CATCH_UP_MINUTES) return;

    const slotIndex = lastResponse.notification.request.content.data
      ?.slotIndex as number | undefined;
    if (slotIndex !== undefined) openDoseAlert(slotIndex);
  }, [lastResponse, openDoseAlert]);

  // 2. Fired while the app is in the foreground — the OS timer is reliable even
  //    when the JS interval below has been throttled.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const slotIndex = notification.request.content.data?.slotIndex as
          number | undefined;
        if (slotIndex !== undefined) openDoseAlert(slotIndex);
      },
    );
    return () => sub.remove();
  }, [openDoseAlert]);

  // ── Arm the daily OS notifications on every app start ─────────────────────
  // The `times` store subscription only fires when the value *changes*, so a
  // user who never edited a time would otherwise have no notifications at all.

  useEffect(() => {
    syncSlotNotifications(useHomeStore.getState().times);
  }, []);

  // ── In-app clock (stable ref to avoid interval recreation) ─────────────

  const checkRef = useRef(checkDoseAlerts);
  checkRef.current = checkDoseAlerts;

  useEffect(() => {
    checkRef.current();
    const interval = setInterval(
      () => checkRef.current(),
      DOSE_CHECK_INTERVAL_MS,
    );

    // JS timers are frozen while the app is backgrounded, so a slot minute can
    // pass with no tick at all. Re-check the moment we come back to the front —
    // the store uses a catch-up window, so a late slot still raises the modal.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkRef.current();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLabelPress = (label: string) => {
    const key = slugify(label, { lower: true, strict: true, replacement: "-" });
    if (editing) {
      navigation.navigate("Camera", { drugId: key });
    } else if (photos[key]) {
      setPreviewUri(photos[key]);
    }
  };

  useEffect(() => {
    if (route.params?.photoPath && route.params?.timeSlot) {
      setPhoto(route.params.timeSlot, route.params.photoPath);
      navigation.setParams({
        photoPath: undefined,
        timeSlot: undefined,
      } as any);
    }
  }, [route.params, navigation, setPhoto]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-400">
      <ScrollView className="flex-1">
        <View className="px-4 pt-14 pb-8">
          {/* Bluetooth Banner */}
          <BluetoothBanner
            connectedDevice={connectedDevice}
            onConnect={() => navigation.navigate("BleDevices")}
            onDisconnect={() => disconnectDevice()}
          />
          {/* Drug Table */}
          <DrugTable
            data={data}
            editing={editing}
            photos={photos}
            times={times}
            onIncrement={increment}
            onHeaderPress={handleHeaderPress}
            onLabelPress={handleLabelPress}
          />
          {/* Action Buttons */}
          <View className="mt-4 flex-row gap-4">
            {!editing ? (
              <Button
                size="lg"
                onPress={() => setEditing(true)}
                className="flex-1 bg-black  rounded-none h-14 "
              >
                <ButtonText className="font-bold text-white text-base tracking-wide">
                  ✏️ EDIT
                </ButtonText>
              </Button>
            ) : (
              <Button
                size="lg"
                onPress={handleSave}
                className="flex-1 bg-green-600  rounded-none h-14 "
              >
                <ButtonText className="font-bold text-white text-base tracking-wide">
                  💾 SAVE
                </ButtonText>
              </Button>
            )}
          </View>
          <DoseHistory history={history} onClear={clearHistory} />
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          onPress={() => setPreviewUri(null)}
          className="flex-1 bg-black/80 items-center justify-center px-6"
        >
          {previewUri && (
            <View className="w-full rounded-none overflow-hidden bg-gray-600">
              <RNImage
                source={{ uri: previewUri }}
                className="w-full aspect-[3/4]"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => setPreviewUri(null)}
                className="py-4 items-center"
              >
                <Text className="text-white font-bold text-base">✕ Close</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={editingTimeIndex !== null}
        index={editingTimeIndex}
        times={times}
        onClose={() => setEditingTimeIndex(null)}
        onChangeTime={setTimes}
      />

      {/* Dose Alert Modal */}
      <DoseAlertModal
        visible={doseAlertIndex !== null}
        slotIndex={doseAlertIndex}
        data={savedData}
        scheduledTime={
          doseAlertIndex !== null ? times[doseAlertIndex] : undefined
        }
        onConfirm={handleDoseConfirm}
        onSkip={handleDoseSkip}
        onSnooze={snoozeDoseAlert}
      />
    </View>
  );
}
