# Design tokens — audit-flow

Mọi giá trị nằm trong `:root` của `src/overhaul.css`. Quy tắc: **không hard-code
màu, cỡ chữ, hay khoảng cách trong component** — luôn dùng token.

## Màu

Palette có **một màu thương hiệu** và **ba màu ngữ nghĩa**. Chúng không thay thế nhau.

| Vai trò | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Thương hiệu / hành động | `--accent` | `#c36d46` | nút chính, tab đang mở, item đang chọn, kicker, focus ring |
| | `--soft` | `#f5e9e2` | nền nhạt của accent |
| Thành công | `--ok` | `#437a53` | đã verify, matched, task done, AI match |
| | `--okink` / `--oksoft` | `oklch(43% .09 152)` / `#e4f1e7` | chữ / nền của notice thành công |
| Cần review | `--warn` | `oklch(63% .14 70)` | highlight trên PDF, badge Review |
| | `--warnink` / `--warnsoft` | | chữ / nền của dòng cảnh báo |
| Thiếu / chặn | `--danger` | `oklch(57% .18 25)` | document còn thiếu, lỗi bắt buộc |
| | `--dangersoft` | | nền của card missing |

**Đừng dùng accent cho trạng thái thành công.** Trước đây có `--green: var(--accent)` —
tên là green nhưng giá trị là cam, nên mọi dấu tick đều ra cam. Alias đó đã bị xoá.

Nền và chữ (xám đều lệch ấm để hợp với terracotta, không dùng xám trung tính):

| `--ink` `#27221d` | `--muted` `#6e6861` | `--paper` `#fffdf9` | `--canvas` `#f6f4ef` | `--line` `#dedbd4` / `--line-strong` `#94928d` |
|---|---|---|---|---|
| chữ chính | chữ phụ, meta | card, panel | nền app | đường kẻ |

### Tương phản — đã kiểm bằng WCAG 2.1

Quy tắc: `--accent` là **màu nền và màu icon**, không phải màu chữ (3.69:1 — đủ cho
icon ≥3:1 nhưng thiếu cho chữ). Chữ màu accent, và mọi nền đặc mang chữ trắng,
dùng `--accent-ink` `#a5522a`. Tương tự có `--dangerink`.

| Cặp màu | Tỉ lệ | Ngưỡng |
|---|---|---|
| ink / paper | 15.5 | 4.5 |
| muted / paper · canvas · soft | 5.39 · 4.98 · 4.60 | 4.5 |
| accent-ink / paper · soft | 5.38 · 4.59 | 4.5 |
| ok / paper | 4.98 | 4.5 |
| okink / oksoft | 6.63 | 4.5 |
| warnink / warnsoft | 7.53 | 4.5 |
| dangerink / dangersoft | 4.64 | 4.5 |
| #fff / accent-ink (nút chính) | 5.47 | 4.5 |
| #fff / ok (tick done) | 5.06 | 4.5 |
| line-strong / paper (viền control) | 3.06 | 3.0 |
| line / paper (đường kẻ trang trí) | 1.36 | miễn |

**Không bao giờ dùng `opacity` để làm mờ chữ.** Trước đây task đã done dùng
`opacity: .55` khiến chữ phụ rớt xuống **1.9:1**, và transaction chưa chọn dùng
`opacity: .7` → 2.36:1. Trạng thái done giờ thể hiện bằng gạch ngang + tick xanh
đặc + nền card đổi sang canvas, chữ vẫn giữ nguyên độ tương phản.

## Chữ

Sáu cỡ, **một độ đậm duy nhất là 600**. Phân cấp bằng cỡ + màu, không bằng độ đậm.

| Token | px | Dùng cho |
|---|---|---|
| `--t-xs` | 12 | nhãn viết hoa, badge, chip |
| `--t-sm` | 13 | chữ phụ, meta, `<small>` |
| `--t-md` | 14 | body (mặc định) |
| `--t-lg` | 16 | tiêu đề card (h3) |
| `--t-xl` | 19 | tiêu đề section (h2), số thống kê |
| `--t-2xl` | 26 | tiêu đề trang (h1) — 22px dưới 650px |

Line-height: `--lh-tight` 1.2 (h1) · `--lh-snug` 1.35 (h2, h3) · `--lh-body` 1.5.
Nhãn viết hoa dùng `--caps` (letter-spacing .08em). Sàn là 12px — không có chữ nào nhỏ hơn.
Số liệu (tiền, ngày, số trang, %) dùng `font-variant-numeric: tabular-nums` để thẳng cột.

## Khoảng cách

Thang 4px: `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 20 · `--s6` 24 ·
`--s8` 32 · `--s10` 40 · `--s12` 48.

Áp dụng cho `padding` / `margin` / `gap`. **Không** áp cho hình học của component —
vị trí rail timeline, offset của node, kích thước control, chiều cao thanh viewer:
những giá trị đó được tính, không phải nhịp.

## Bo góc

`--r-card` 12px (card, panel, modal) · `--r-ctl` 10px (input, button, notice) ·
`--r-chip` 8px (badge, icon button) · `--r-pill` 999px (chip trạng thái).

## Đổ bóng

Bóng mang hue ấm (h 50) của palette, không dùng xám lạnh mặc định — bóng xanh
trên nền giấy ấm trông như vết bẩn.

`--e1` viền nổi nhẹ (thumbnail, hover) · `--e2` nổi (trang PDF, card sticky) ·
`--e3` overlay (modal) · `--scrim` nền mờ sau modal.

## Chuyển động

`--fast` 120ms (hover, màu) · `--base` 180ms (layout) · `--ease` `cubic-bezier(.2,0,.2,1)`.
Toàn bộ animation bị tắt dưới `prefers-reduced-motion: reduce`.

## Căn control với chữ

Control đứng đầu dòng (checkbox, radio, tick, nút icon) căn theo **dòng đầu tiên của
khối chữ bên cạnh**, không căn giữa cả khối:

```
offset = (line-box của tiêu đề − chiều cao control) / 2
       = (16px × 1.35 − 24px) / 2 = −1px
```

Dùng `align-self: start` + `margin-top` bằng offset đó. Card có nhiều dòng mà căn
`align-items: center` sẽ khiến control trôi xuống giữa khối — đó là lỗi cần tránh.
