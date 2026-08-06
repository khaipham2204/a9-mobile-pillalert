# Dose Alert & History — Luồng hoạt động

Tài liệu này mô tả luồng nhắc uống thuốc (`DoseAlertModal`) và ghi lịch sử
(`DoseHistory`), cùng các lỗi đã được sửa trong lần cập nhật này.

Các file liên quan:

- [screens/home.tsx](../screens/home.tsx) — timer, AppState, notification listeners, render modal
- [store/homeStore.ts](../store/homeStore.ts) — toàn bộ state + logic quyết định khi nào hiện modal
- [components/home/helpers.ts](../components/home/helpers.ts) — storage, time, speech, notification helpers
- [components/home/types.ts](../components/home/types.ts) — types + hằng số cấu hình
- [components/home/DoseAlertModal.tsx](../components/home/DoseAlertModal.tsx) — UI modal
- [components/home/DoseHistory.tsx](../components/home/DoseHistory.tsx) — UI danh sách lịch sử

---

## 1. Vấn đề đã gặp

> "Sau 1 khoảng thời gian vào app sẽ không hiện modal này nên không thể record
> history được."

### Nguyên nhân chính — so sánh `HH:mm` tuyệt đối + JS timer bị đóng băng

Logic cũ:

```ts
const currentMinute = nowAsTimeString();           // "08:30"
const matchedIndex = times.findIndex(
  (t, i) => t === currentMinute && !_alertedToday[`${i}`],
);
if (matchedIndex === -1) return;
```

Điều này chỉ đúng khi **có một tick của `setInterval(30s)` rơi đúng vào phút
`08:30`**. Cửa sổ trigger rộng đúng 60 giây.

Nhưng JS timer trong React Native bị **dừng hoàn toàn** khi app ở background
(Android Doze / iOS suspend), và bị **throttle** khi JS thread đang bận (BLE
monitor, render). Vì vậy:

1. App bị đưa xuống background lúc 08:00 → timer ngưng chạy.
2. 08:30 trôi qua, không có tick nào.
3. 08:35 người dùng mở app lại → `nowAsTimeString()` = `"08:35"` ≠ `"08:30"`
   → **không bao giờ khớp nữa trong ngày** → không có modal → không có history.

Đây chính là triệu chứng "sau một khoảng thời gian thì không hiện modal".

### Các nguyên nhân phụ (cũng chặn việc record history)

| # | Vấn đề | Hệ quả |
|---|--------|--------|
| 2 | `_alertedToday` được set **ngay khi hiện modal**, trước khi người dùng trả lời | Tap ra ngoài overlay để tắt modal → slot bị coi là "đã nhắc" → không nhắc lại trong ngày → không record được |
| 3 | `_alertedToday` chỉ ở memory, không persist | Restart app → mất → có thể nhắc lại slot đã uống (trùng history) |
| 4 | Không có `AppState` listener | Không có gì kiểm tra lại khi app quay lại foreground |
| 5 | `scheduleSlotNotifications` chỉ được gọi trong `subscribe((s) => s.times, …)` | Subscription chỉ chạy khi `times` **thay đổi**. Người dùng chưa từng sửa giờ (dùng `DEFAULT_TIMES`) → **không có notification nào được đặt, và không có xin quyền notification** → mất luôn đường fallback của OS |
| 6 | Chỉ lắng nghe `addNotificationResponseReceivedListener` | Chỉ chạy khi người dùng **tap** notification. Nếu app bị kill, response đã được gửi trước khi listener mount → mất. Nếu notification nổ lúc app đang foreground → không có gì mở modal |
| 7 | `if (editing) return` + exact match | Đang ở chế độ EDIT lúc đến giờ → bỏ qua tick, và vì exact match nên giờ đó mất luôn |
| 8 | Modal render bên trong `ScrollView` | Không phải nguyên nhân chính nhưng là anti-pattern trên Android |

---

## 2. Luồng hoạt động sau khi sửa

### 2.1 Ba nguồn kích hoạt (trigger)

```
┌─────────────────────────────────────────────────────────────────────┐
│ A. In-app clock          setInterval(DOSE_CHECK_INTERVAL_MS = 30s)  │
│    + chạy ngay khi mount                          → checkDoseAlerts()│
├─────────────────────────────────────────────────────────────────────┤
│ B. AppState "active"     app quay lại foreground   → checkDoseAlerts()│
│    ← đây là thứ bù lại khoảng thời gian timer bị đóng băng            │
├─────────────────────────────────────────────────────────────────────┤
│ C. OS notification (expo-notifications, DAILY trigger)               │
│    C1. useLastNotificationResponse()  → tap (cả cold start & warm)   │
│    C2. addNotificationReceivedListener() → nổ lúc app ở foreground   │
│                                                   → openDoseAlert(i) │
└─────────────────────────────────────────────────────────────────────┘
```

A và B đi qua `checkDoseAlerts()` (có kiểm tra cửa sổ due).
C đi qua `openDoseAlert(slotIndex)` (mở trực tiếp, chỉ chặn nếu slot đã trả lời).

### 2.2 `checkDoseAlerts()` — thuật toán quyết định

```
1. rollOverDay(_slotState)
   → nếu _slotState.date !== hôm nay: reset { date: today, resolved: {} }
     và xoá _snoozedUntil.   (session sống qua nửa đêm vẫn hoạt động)

2. Nếu editing === true HOẶC doseAlertIndex !== null → return
   ⚠️ KHÔNG mark gì cả, để tick sau đánh giá lại → không mất slot nào.

3. nowMin = giờ hiện tại tính theo phút-từ-nửa-đêm (minutesOfDay())

4. Với mỗi slot i:
      slotMin = timeToMinutes(times[i])        // null nếu dữ liệu lỗi → bỏ qua
      lateBy  = nowMin - slotMin

      bỏ qua nếu lateBy < 0                       (chưa đến giờ)
      bỏ qua nếu lateBy > DOSE_CATCH_UP_MINUTES   (quá muộn, 180 phút)
      bỏ qua nếu _slotState.resolved[i]           (đã Taken / Skip hôm nay)
      bỏ qua nếu _snoozedUntil[i] > now          (vừa tap ra ngoài để tắt)

   → chọn slot có slotMin LỚN NHẤT (gần hiện tại nhất) nếu có nhiều slot due.

5. set doseAlertIndex = slot đó  → modal hiện
6. speakDoseReminder(slot, drugs)  → đọc TTS danh sách thuốc
```

**Điểm cốt lõi của bản sửa:** thay so sánh bằng (`===`) bằng **cửa sổ due**
`0 ≤ lateBy ≤ DOSE_CATCH_UP_MINUTES`. Mở app muộn 2 tiếng vẫn nhận được modal và
vẫn record được history (modal hiển thị thêm dòng `⏰ X min late`).

### 2.3 Ba cách đóng modal — ba ý nghĩa khác nhau

| Hành động | Store action | `_slotState.resolved` | History | Hiện lại hôm nay? |
|-----------|--------------|----------------------|---------|-------------------|
| Nút **✓ Taken** | `handleDoseConfirm` | `"taken"` | ✅ ghi 1 `DoseRecord` | Không |
| Nút **Skip** | `handleDoseSkip` | `"skipped"` | ❌ không ghi | Không |
| Tap ra ngoài / back | `snoozeDoseAlert` | *không đổi* | ❌ | **Có**, sau `DOSE_SNOOZE_MINUTES` (5 phút) |

Trước đây cả ba đều chạy chung `onDismiss` → mọi cách đóng đều "đốt" luôn slot
của ngày hôm đó. Đây là lý do thứ hai khiến history không được ghi.

Cả ba đều gọi `Speech.stop()` để tắt TTS.

### 2.4 Persistence (MMKV, `store/storage.ts`)

Ghi qua `useHomeStore.subscribe(selector, …)`:

| Key | State | Ghi chú |
|-----|-------|---------|
| `home:drugData` | `savedData` | |
| `home:photos` | `photos` | |
| `home:time` | `times` | đồng thời reset `_snoozedUntil` và gọi `syncSlotNotifications()` |
| `home:doseHistory` | `history` | |
| `home:slotState` | `_slotState` | **mới** — bảng trả lời theo ngày |

`loadSlotState()` khi khởi động sẽ **bỏ qua** dữ liệu nếu `date` không phải hôm
nay, nên câu trả lời của hôm qua không thể làm im lặng hôm nay.

### 2.5 OS notifications

`syncSlotNotifications(times)` = `requestNotificationPermission()` +
`scheduleSlotNotifications(times)` (cancel all → đặt lại 3 `DAILY` trigger, mỗi
notification mang `data: { slotIndex, slotKey }`).

Được gọi ở **hai** nơi:

1. `useEffect(…, [])` trong [screens/home.tsx](../screens/home.tsx) → mỗi lần
   app khởi động (sửa nguyên nhân #5).
2. Subscription của `times` → mỗi khi người dùng đổi giờ.

---

## 3. Danh sách thay đổi

### `components/home/types.ts`

- Thêm type `SlotResolution` (`"taken" | "skipped"`) và `SlotDayState`
  (`{ date, resolved }`).
- Thêm hằng số: `STORAGE_KEY_SLOT_STATE`, `DOSE_CATCH_UP_MINUTES` (180),
  `DOSE_SNOOZE_MINUTES` (5), `DOSE_CHECK_INTERVAL_MS` (30 000).

### `components/home/helpers.ts`

- Thêm `todayKey()`, `minutesOfDay()`, `timeToMinutes()` (trả `null` khi dữ liệu
  giờ bị lỗi thay vì `NaN`).
- Thêm `loadSlotState()` — chỉ trả về dữ liệu của đúng ngày hôm nay.
- Thêm `syncSlotNotifications()` = xin quyền + schedule, an toàn khi gọi lại.
- `scheduleSlotNotifications()` bỏ qua các slot có giờ không parse được.

### `store/homeStore.ts`

- **Bỏ** `_alertedToday` / `_lastAlertDate`.
- **Thêm** `_slotState` (persist) và `_snoozedUntil` (memory).
- `checkDoseAlerts()` viết lại theo cửa sổ due + catch-up (mục 2.2).
- `handleDoseConfirm()` nay cũng mark slot là `"taken"`.
- **Thêm** `handleDoseSkip()`, `snoozeDoseAlert()`, `openDoseAlert()`.
- **Bỏ** `setDoseAlertIndex()` — setter thô này bỏ qua toàn bộ kiểm tra
  resolved/snooze; dùng `openDoseAlert()` / `snoozeDoseAlert()` thay thế.
- Thêm subscription persist `_slotState`; subscription `times` dùng
  `syncSlotNotifications` và reset snooze.

### `screens/home.tsx`

- Thêm `AppState` listener → `checkDoseAlerts()` khi app trở lại `"active"`.
- Đổi sang `Notifications.useLastNotificationResponse()` (xử lý cả cold start)
  + thêm `addNotificationReceivedListener` cho trường hợp foreground; có kiểm
  tra "tuổi" của notification để không replay tap của ngày hôm trước.
- Gọi `syncSlotNotifications()` một lần khi mount.
- Truyền `onSkip` / `onSnooze` / `scheduledTime` cho `DoseAlertModal`.
- Đưa các `Modal` ra ngoài `ScrollView` (bọc trong một `View flex-1`).

### `components/home/DoseAlertModal.tsx`

- `onDismiss` → tách thành `onSkip` (nút Skip) và `onSnooze` (tap ngoài / back).
- Nhận thêm `scheduledTime`, hiển thị giờ dự kiến và `⏰ X min late` khi trễ.

---

## 4. Cấu hình / tinh chỉnh

Tất cả ở [components/home/types.ts](../components/home/types.ts):

- `DOSE_CATCH_UP_MINUTES = 180` — mở app muộn quá 3 tiếng thì không nhắc nữa.
  Muốn "nhắc đến hết ngày" thì đặt `24 * 60`.
- `DOSE_SNOOZE_MINUTES = 5` — khoảng im lặng sau khi tap ra ngoài.
- `DOSE_CHECK_INTERVAL_MS = 30_000` — tần suất tick. Không cần nhỏ nữa vì logic
  đã dùng cửa sổ chứ không còn khớp phút tuyệt đối.

---

## 5. Cách kiểm thử

1. **Catch-up (bug gốc):** đặt giờ slot = hiện tại + 2 phút → đưa app xuống
   background (nút Home) → đợi qua giờ đó 3–4 phút → mở lại app.
   → Modal phải hiện kèm `⏰ X min late`; bấm **✓ Taken** → thấy bản ghi mới
   trong Dose History.
2. **Snooze:** khi modal hiện, tap ra vùng tối bên ngoài → modal đóng → sau 5
   phút (hoặc tạm hạ `DOSE_SNOOZE_MINUTES`) modal hiện lại.
3. **Skip:** bấm **Skip** → modal đóng và **không** hiện lại trong ngày, không
   có bản ghi history.
4. **Chống trùng sau restart:** bấm **✓ Taken**, kill app, mở lại trong cửa sổ
   catch-up → modal **không** hiện lại (nhờ `home:slotState`).
5. **Qua nửa đêm:** sửa ngày hệ thống sang ngày mai → tick tiếp theo phải reset
   `resolved` và nhắc lại các slot của ngày mới.
