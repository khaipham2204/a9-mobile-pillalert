import {
  loadDrugData,
  loadHistory,
  loadPhotos,
  loadSlotState,
  loadTimes,
  minutesOfDay,
  nowAsTimeString,
  speakDoseReminder,
  syncSlotNotifications,
  timeToMinutes,
  todayKey,
} from "@/components/home/helpers";
import {
  DOSE_CATCH_UP_MINUTES,
  DOSE_SNOOZE_MINUTES,
  STORAGE_KEY_DATA,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_PHOTOS,
  STORAGE_KEY_SLOT_STATE,
  STORAGE_KEY_TIME,
  TIME_FIELDS,
  type DoseRecord,
  type Drug,
  type SlotDayState,
  type SlotResolution,
  type TimeSlotKey,
} from "@/components/home/types";
import { BLE_DATA_TYPE, BLE_EVENT_TYPE } from "@/constants/theme";
import { useBluetoothStore } from "@/store/bluetoothStore";
import { storage } from "@/store/storage";
import * as Speech from "expo-speech";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeState = {
  // ── Persistent data ──
  data: Drug[];
  savedData: Drug[];
  photos: Record<string, string>;
  times: string[];
  history: DoseRecord[];

  // ── UI state ──
  editing: boolean;
  previewUri: string | null;
  editingTimeIndex: number | null;
  doseAlertIndex: number | null;

  // ── Actions ──
  setEditing: (editing: boolean) => void;
  increment: (index: number, field: TimeSlotKey) => void;
  decrement: (index: number, field: TimeSlotKey) => void;
  handleSave: () => Promise<void>;
  handleHeaderPress: (i: number) => void;
  setPreviewUri: (uri: string | null) => void;
  setEditingTimeIndex: (index: number | null) => void;
  setTimes: (updater: string[] | ((prev: string[]) => string[])) => void;
  setPhoto: (key: string, uri: string) => void;
  handleDoseConfirm: (
    slotKey: TimeSlotKey,
    drugs: { name: string; qty: number }[],
  ) => void;
  /** "Skip" button — resolves the slot for today without writing history. */
  handleDoseSkip: () => void;
  /** Tap-outside / back button — hide now, re-ask in DOSE_SNOOZE_MINUTES. */
  snoozeDoseAlert: () => void;
  clearHistory: () => void;

  /** Open the modal for a slot (notification tap), unless already answered. */
  openDoseAlert: (slotIndex: number) => void;

  // ── Internal (clock check) ──
  /** Per-day answer sheet, persisted to MMKV. */
  _slotState: SlotDayState;
  /** slotIndex → epoch ms before which the slot stays quiet. */
  _snoozedUntil: Record<string, number>;
  checkDoseAlerts: () => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

const initialDrugData = loadDrugData();

export const useHomeStore = create<HomeState>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial state ──
    data: initialDrugData,
    savedData: initialDrugData,
    photos: loadPhotos(),
    times: loadTimes(),
    history: loadHistory(),
    editing: false,
    previewUri: null,
    editingTimeIndex: null,
    doseAlertIndex: null,
    _slotState: loadSlotState(),
    _snoozedUntil: {},

    // ── Actions ──
    setEditing: (editing) => set({ editing }),

    increment: (index, field) =>
      set((state) => ({
        data: state.data.map((item, i) =>
          i === index ? { ...item, [field]: item[field] + 1 } : item,
        ),
      })),

    decrement: (index, field) =>
      set((state) => ({
        data: state.data.map((item, i) =>
          i === index
            ? { ...item, [field]: Math.max(0, item[field] - 1) }
            : item,
        ),
      })),

    handleSave: async () => {
      const { data, times } = get();
      console.log("Saving data:", data);

      set({
        savedData: data,
        editing: false,
      });
      const { connectedDevice, sendPayload } = useBluetoothStore.getState();

      if (!connectedDevice) {
        console.warn("Không có thiết bị Bluetooth đang kết nối.");
        return;
      }
      await sendPayload({
        type: BLE_DATA_TYPE.EVENT,
        message: {
          name: BLE_EVENT_TYPE.SETTING_ALARM_TIME,
          time: times,
          drugslot: data,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        },
      });
    },
    handleHeaderPress: (i) => {
      const { editing } = get();
      if (!editing) return;
      set((state) => ({
        times: state.times.map((t, idx) => (idx === i ? nowAsTimeString() : t)),
        editingTimeIndex: i,
      }));
    },

    setPreviewUri: (uri) => set({ previewUri: uri }),
    setEditingTimeIndex: (index) => set({ editingTimeIndex: index }),

    setTimes: (updater) =>
      set((state) => ({
        times: typeof updater === "function" ? updater(state.times) : updater,
      })),

    setPhoto: (key, uri) =>
      set((state) => ({ photos: { ...state.photos, [key]: uri } })),

    handleDoseConfirm: (slotKey, drugs) => {
      const record: DoseRecord = {
        takenAt: new Date().toISOString(),
        slotKey,
        drugs,
      };
      const slotIndex = TIME_FIELDS.indexOf(slotKey);
      set((state) => ({
        history: [record, ...state.history],
        doseAlertIndex: null,
        _slotState: resolveSlot(state._slotState, slotIndex, "taken"),
      }));
      Speech.stop();
    },

    handleDoseSkip: () => {
      const { doseAlertIndex } = get();
      set((state) => ({
        doseAlertIndex: null,
        _slotState:
          doseAlertIndex === null
            ? state._slotState
            : resolveSlot(state._slotState, doseAlertIndex, "skipped"),
      }));
      Speech.stop();
    },

    snoozeDoseAlert: () => {
      const { doseAlertIndex } = get();
      if (doseAlertIndex === null) {
        set({ doseAlertIndex: null });
        return;
      }
      set((state) => ({
        doseAlertIndex: null,
        _snoozedUntil: {
          ...state._snoozedUntil,
          [`${doseAlertIndex}`]: Date.now() + DOSE_SNOOZE_MINUTES * 60_000,
        },
      }));
      Speech.stop();
    },

    clearHistory: () => set({ history: [] }),

    openDoseAlert: (slotIndex) => {
      if (slotIndex < 0 || slotIndex >= TIME_FIELDS.length) return;
      const slotState = rollOverDay(get()._slotState);
      if (slotState.resolved[`${slotIndex}`]) {
        // Already taken/skipped today — nothing to ask.
        set({ _slotState: slotState });
        return;
      }
      set({ _slotState: slotState, doseAlertIndex: slotIndex });

      const field = TIME_FIELDS[slotIndex];
      const drugs = get()
        .savedData.filter((d) => d[field] > 0)
        .map((d) => ({ name: d.name, qty: d[field] }));
      speakDoseReminder(slotIndex, drugs);
    },

    // ── Clock check (interval + AppState resume) ──
    checkDoseAlerts: () => {
      const { editing, times, savedData, doseAlertIndex, _snoozedUntil } =
        get();

      // Roll the day over first, otherwise a session that survives midnight
      // keeps yesterday's answers and never alerts again.
      const slotState = rollOverDay(get()._slotState);
      if (slotState !== get()._slotState) {
        set({ _slotState: slotState, _snoozedUntil: {} });
      }

      // Modal already open, or the user is mid-edit: bail WITHOUT marking
      // anything, so the next tick re-evaluates and nothing is lost.
      if (editing || doseAlertIndex !== null) return;

      const now = Date.now();
      const nowMin = minutesOfDay();

      // Pick the latest slot that is due, unanswered and not snoozed.
      // A window (not an exact "HH:mm" equality) is what makes catch-up work:
      // JS timers are frozen while the app is backgrounded, so the one tick
      // that fell inside the scheduled minute may simply never have happened.
      let dueIndex = -1;
      let dueMin = -1;
      for (let i = 0; i < times.length; i++) {
        const slotMin = timeToMinutes(times[i]);
        if (slotMin === null) continue;

        const lateBy = nowMin - slotMin;
        if (lateBy < 0 || lateBy > DOSE_CATCH_UP_MINUTES) continue;
        if (slotState.resolved[`${i}`]) continue;
        if ((_snoozedUntil[`${i}`] ?? 0) > now) continue;

        if (slotMin > dueMin) {
          dueMin = slotMin;
          dueIndex = i;
        }
      }
      if (dueIndex === -1) return;

      set({ doseAlertIndex: dueIndex });

      const field = TIME_FIELDS[dueIndex];
      const drugs = savedData
        .filter((d) => d[field] > 0)
        .map((d) => ({ name: d.name, qty: d[field] }));
      speakDoseReminder(dueIndex, drugs);
    },
  })),
);

// ─── Slot-state helpers ───────────────────────────────────────────────────────

/** Return a fresh answer sheet when the calendar day changed. */
function rollOverDay(state: SlotDayState): SlotDayState {
  const today = todayKey();
  return state.date === today ? state : { date: today, resolved: {} };
}

function resolveSlot(
  state: SlotDayState,
  slotIndex: number,
  resolution: SlotResolution,
): SlotDayState {
  if (slotIndex < 0) return state;
  const base = rollOverDay(state);
  return {
    date: base.date,
    resolved: { ...base.resolved, [`${slotIndex}`]: resolution },
  };
}

// ─── Side effects: persist to MMKV on change ─────────────────────────────────

useHomeStore.subscribe(
  (s) => s.savedData,
  (savedData) => storage.set(STORAGE_KEY_DATA, JSON.stringify(savedData)),
);

useHomeStore.subscribe(
  (s) => s.photos,
  (photos) => storage.set(STORAGE_KEY_PHOTOS, JSON.stringify(photos)),
);

useHomeStore.subscribe(
  (s) => s.times,
  (times) => {
    storage.set(STORAGE_KEY_TIME, JSON.stringify(times));
    // Changing a time clears that slot's snooze, otherwise a slot moved to
    // "now" could stay silent for the rest of the snooze window.
    useHomeStore.setState({ _snoozedUntil: {} });
    syncSlotNotifications(times);
  },
);

useHomeStore.subscribe(
  (s) => s.history,
  (history) => storage.set(STORAGE_KEY_HISTORY, JSON.stringify(history)),
);

useHomeStore.subscribe(
  (s) => s._slotState,
  (slotState) => storage.set(STORAGE_KEY_SLOT_STATE, JSON.stringify(slotState)),
);
