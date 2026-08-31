# Audit Flow — Bổ sung spec (phần Codex chưa nêu)

> Đọc kèm với list P0/P1/P2 của Codex. File này **không lặp lại** những gì Codex đã đúng —
> nó (A) sửa/làm rõ vài điểm Codex nói chưa tới, (B) thêm các lỗi & khoảng trống Codex bỏ sót,
> (C) đưa ra thứ tự thi công đã tính tới phụ thuộc kỹ thuật.
>
> Cơ sở: đọc toàn bộ `src/main.jsx` (1052 dòng), `package.json`, `public/form-pages/*`.
> Trạng thái xác nhận: **0 `useEffect`, 0 `useReducer`, 0 `localStorage`, 0 pdf.js**, 32 chỗ có
> `onClick/onChange/useState` cho toàn bộ 6 bước.

---

## PHẦN A — Điểm Codex nói chưa tới

### A1. Không thể highlight toạ độ field khi còn dùng `<iframe src="*.pdf">`  ⚠️ chặn P0-#5

Codex nói "chưa highlight chính xác field" và đề xuất dùng `pdf-field-data.ts`. Nhưng vấn đề không
phải thiếu data — mà là **kiến trúc viewer hiện tại về nguyên tắc không cho phép highlight**:

- Viewer là native PDF plugin của trình duyệt trong iframe (`src/main.jsx:757–770`).
  App **không đọc được** scroll offset, zoom thực tế, hay vị trí page bên trong iframe đó.
  Một overlay `position:absolute` đặt lên iframe sẽ trôi ngay khi user scroll/zoom trong PDF.
- `#page=N` chỉ hoạt động ở Chrome/Edge/Firefox. **Safari bỏ qua fragment này** → tính năng
  "click field → nhảy đúng trang" hiện đã hỏng sẵn trên Safari.
- `key={`${doc.id}-${page}`}` ép **remount + tải lại toàn bộ PDF mỗi lần đổi trang** → nháy trắng,
  chậm, và mất vị trí scroll.

**Bắt buộc chọn 1 trong 2 hướng trước khi làm bất cứ việc gì liên quan highlight:**

| | Hướng 1 — page images + overlay (khuyến nghị cho demo) | Hướng 2 — pdf.js |
|---|---|---|
| Render | dùng sẵn `public/form-pages/<form>/page-N.jpg` | `pdfjs-dist` canvas + text layer |
| Highlight | div `%`-based tuyệt đối trên ảnh — chính xác 100%, dễ | dùng viewport transform |
| Zoom/Search toolbar | tự làm, dễ (CSS transform + tìm trong text layer nếu có) | có sẵn API |
| File user upload | ❌ không có ảnh page → phải fallback | ✅ render được ngay |
| Công sức | ~0.5 ngày | ~2 ngày |

→ Đề xuất: **Hướng 1 cho 13 form có sẵn, Hướng 2 (pdf.js) chỉ cho file upload**, dùng chung
một component `<PdfPane>` với 2 renderer. Nếu ngân sách hạn chế thì làm Hướng 2 luôn cho đồng nhất.

### A2. Upload hiện **không có chỗ để hiển thị** — không chỉ thiếu `onChange`  ⚠️ chặn P0-#1

PDF được serve tĩnh từ `/forms/<file>.pdf`. File user upload chỉ tồn tại trong memory
(`URL.createObjectURL`). Nghĩa là ngay cả khi thêm `onChange`, file vừa upload:
- không có thumbnail (`/form-pages/...` không tồn tại) → cột thumbs vỡ,
- iframe blob URL không nhận `#page=N` ổn định.

→ Upload **phụ thuộc vào quyết định A1**. Làm A1 trước, rồi mới làm upload.

### A3. `pdf-field-data.ts` không có trong repo này

Codex nói "trong folder revamp đã có". Folder `audit-flow` được connect **không chứa** file đó
(đã tìm toàn bộ cây thư mục). Cần copy nó sang, hoặc coi như phải tự sinh. Xem C1 để biết
schema tối thiểu cần có.

### A4. "45–50% hoàn thành" — đánh giá lại

Về **UI/flow** thì đúng ~50%. Nhưng theo đúng flow bạn mô tả, hai tương tác đầu não đang ở **0%**:
1. click warning → cuộn tới đúng dòng/trường trong PDF,
2. click term → hiện trong tài liệu / redirect policy / yêu cầu upload.

Và **không tồn tại rule engine** (xem B1). Tính theo *chức năng*, thực tế gần **30–35%**.

---

## PHẦN B — Codex bỏ sót hoàn toàn

### B1. 🔴 Không có rule engine — warning là chuỗi hard-code, không phản ứng với dữ liệu

Đây là lỗi **nguy hiểm nhất khi demo**. Warning "Property was built before 1978. Lead-Based Paint
Disclosure is required." là literal string ở `main.jsx:150`. Nó **không** được tính từ field
`Year built`.

> Demo dễ chết: sửa Year built thành `1990` → warning pre-1978 **vẫn còn**, LBP vẫn bị đòi.
> Ngược lại, `State = Texas` → vẫn ra nguyên bộ form California.

Con số `24 checks verified` (`main.jsx:679`) cũng là literal — trong khi số warning thật là
`groups.flatMap(...).filter(f => f[6]).length` = **2**. Hai con số này không liên quan gì nhau.

**Cần:** một module `rules.js` thuần dữ liệu:

```js
// rules.js
export const RULES = [
  { id: 'lbp-1978', when: ctx => ctx.state === 'CA' && ctx.yearBuilt < 1978,
    requires: ['lead'], severity: 'blocking',
    message: ctx => `Property built ${ctx.yearBuilt} (pre-1978). Lead-Based Paint Disclosure required.`,
    authority: 'policy:federal-lbp-42usc4852d' },
  { id: 'comp-mismatch', kind: 'cross-doc',
    compare: ['brbc.compensation', 'rpa-addendum.compensation'],
    severity: 'blocking' },
  ...
];
export function runRules(ctx, docs, fields) { /* → Finding[] */ }
```
`checksVerified = findings.filter(f => f.status === 'pass').length` — số hiển thị phải sinh ra từ đây.

Rule set phải phụ thuộc `{ state, transactionType, representation, yearBuilt }` — đây chính là
"re-run requirements khi đổi State" ở P1-#6 của Codex, nhưng Codex không nói rằng **chưa có gì để re-run**.

### B2. 🔴 Cảnh báo "conflict" hiện chỉ có **một** phía

Finding compensation nói *"RPA addendum states 2.48%"* — nhưng:
- `2.48%` không tồn tại trong bất kỳ data structure nào,
- **"RPA addendum" không phải là document trong transaction** — nó không có trong `docs0`.

Nên khi user click vào warning này, không có nguồn thứ hai để nhảy tới. Đây đúng ra là tính năng
bán hàng số 1 của Orqestron (cross-form consistency + provenance).

**Cần data shape 2 phía:**
```js
{ id: 'comp', kind: 'conflict', severity: 'blocking',
  sides: [
    { docId: 'brbc',    page: 3,  bbox: [...], value: '2.5%',  label: 'BRBC §3 Compensation', extracted: '...' },
    { docId: 'addendum',page: 1,  bbox: [...], value: '2.48%', label: 'Addendum §2',          extracted: '...' }
  ],
  delta: '$250', resolution: null }
```
UI phải render **cạnh nhau 2 nguồn** + nút "Use this value" cho mỗi bên.

### B3. 🔴 Thumbnail vỡ ở **10/13 document**

`main.jsx:790`: `page-${String(i+1).padStart(2,"0")}.jpg`

Nhưng trên đĩa chỉ 3 form dùng padding 2 chữ số:

| Padded `page-01.jpg` ✅ | Không padded `page-1.jpg` ❌ (đang 404) |
|---|---|
| RPA (25p), BRBC (13p), SBSA (15p) | 10_BIA, 12_FHDA, 53_CR-B, ABA, AD, AEIS, PINNACLE_Addendum, PRBS, RAD, SFV |

→ Fix: thử không-padded trước, fallback padded (hoặc chuẩn hoá lại tên file khi build).

### B4. 🔴 Thumbnail cắt còn 8 trang → **không tới được page 14 của RPA**

`Math.min(doc.pages, 8)` (`main.jsx:788`). RPA có 25 trang. Field "Appraisal contingency" trỏ tới
**RPA page 14**, "Loan contingency" → page 14. User **không có cách nào** điều hướng tay tới đó.

Codex bắt được `open.slice(0,5)` ở tabs (P2-#9) nhưng bỏ qua cái này — trong khi cái này phá đúng
tương tác flagship. Cần: thumbnail scroll toàn bộ trang + ô nhập "Go to page".

### B5. 🔴 `docs0` gán nhầm nhãn: `counter` ≠ Counter Offer

```js
["counter", "Buyer Contingency Removal", "53_CR-B_Buyer_Contingency_Removal-1.2.pdf", ...]
```
Nhưng **4 field** trỏ tới nguồn `"Counter Offer 3 · Item 2/4/6"` với `docId: 'counter'`.
→ Click "Seller credit · Counter Offer 3 · Item 2" sẽ mở **form Contingency Removal 1 trang**,
hiển thị page 1, và không có Counter Offer nào cả. Provenance đang **nói dối**.

Đây là hệ quả cụ thể của P0-#2 (trộn Forms Library vs Transaction docs) mà Codex chỉ nêu chung chung.

### B6. 🟠 `groups`, `dates0`, `tasks` là **const ngoài component** → về nguyên tắc không sửa được

- `groups` (`main.jsx:127`) và `dates0` (`main.jsx:268`): module-level const.
- `tasks` (`main.jsx:928`): const **bên trong** `Tasks()` → không component nào khác chạm được,
  và mất sạch khi back về step 5 rồi vào lại.

Nên P0-#3 (Edit/Resolve không lưu) và P0-#4 (Add deadline) **không phải bug rời** — chúng là
cùng một nguyên nhân gốc. Không lift được state thì không fix được cái nào.

### B7. 🟠 Data model là mảng theo vị trí `f[0]..f[7]` — chặn toàn bộ P2-#17

Mọi thuộc tính Codex đòi thêm (confidence, bbox, extracted text, version, ai resolve, before/after,
timestamp) đều sẽ thành `f[8]`, `f[9]`, `f[10]`… Không maintain nổi.

→ **Việc số 0 của cả dự án**: migrate sang object có tên. Xem C1.

### B8. 🟠 Đổi context ở bước sau không invalidate bước trước

Nếu user đang ở step 4/5 rồi Back về step 2 sửa `State` hoặc `We represent`:
- document requirements phải tính lại,
- findings đã resolve phải reset (hoặc đánh dấu "stale"),
- deadline sinh từ rule cũ phải review lại.

Hiện `resolved` / `dates` / `done` không hề bị đụng tới. User sẽ confirm một audit dựa trên rule cũ.
→ Cần khái niệm `contextVersion`; đổi context ⇒ bump ⇒ mọi finding có `contextVersion` cũ chuyển
trạng thái `stale` và hiện banner "Context changed — re-run audit".

### B9. 🟠 Crash + logic sai trong `<Pdf>`

```js
const open = docs.filter(d => d.present && d.selected),
      doc  = docs.find(d => d.id === active) || open[0];
```
- Nếu `active` trỏ tới doc đã bỏ chọn **và** `open` rỗng → `doc` là `undefined` → `doc.id` **throw**.
- Ở **step 2 (Intake)** viewer lại lọc theo `d.selected` — nhưng việc chọn diễn ra ở **step 3**.
  Nghĩa là ở bước "review file trong transaction", một file `present` nhưng chưa selected **không xem được**.
  Đúng ra step 2 phải cho xem *mọi* file present.

### B10. 🟠 Thiếu bước cuối: **Agent confirm → gửi cho parties**

Note của bạn: *"mục đích để Agent confirm lần nữa trước khi họ gửi những file đã hoàn thành đến parties"*.

Flow hiện dừng ở "Email prepared". Không có:
- trạng thái `awaiting agent confirmation` / `agent confirmed` / `rejected + comment`,
- màn hình packet: chọn file nào gửi cho ai (Buyer / Seller / Escrow / Lender),
- log "đã gửi lúc nào, cho ai, file version nào".

Codex dừng ở P1-#13 (email draft) và không nhận ra flow còn thiếu hẳn **Step 7**.

### B11. 🟡 Không có persistence — reload là mất trắng

Không `localStorage`, không URL state. "Start over" = `location.reload()`. Reload nhầm giữa audit
= làm lại từ đầu. Với demo dài 6 bước cho khách, đây là rủi ro thật.
→ Tối thiểu: persist toàn bộ state vào `localStorage` theo `transactionId`, + `?step=` trên URL.

### B12. 🟡 Không có loading / processing / error / empty state ở bất kỳ đâu

Codex nêu ở P2-#18 cho màn transaction. Nhưng vấn đề là toàn app: classification không có
"Processing…", audit không có "Running 24 checks…", email không có "Sending…". Vì mọi thứ instant nên
**không cảm giác được là AI đang làm gì** — mất phần lớn giá trị demo. Cần skeleton + độ trễ giả lập
có kiểm soát (`await delay()`), không phải instant.

### B13. 🟡 Signature registry và field highlight là **cùng một tầng dữ liệu**

P1-#11 (signature detection) và P0-#5 (highlight) đang bị Codex xếp thành 2 việc rời. Thực ra
chữ ký cũng chỉ là một field có `bbox` + `role` + `required`. Xây **một** registry duy nhất
(xem C1) rồi cả hai tính năng cùng dùng — làm 1 lần thay vì 2.

### B14. 🟡 A11y sẽ vỡ khi demo bằng bàn phím

- `main.jsx:697`: `<div role="button" tabIndex={0}>` **chứa** một `<button>` bên trong → HTML không
  hợp lệ, screen reader đọc sai, Tab bị kẹt.
- `<Pencil />` ở Timeline (`:997`) và Tasks (`:950`) là SVG trần — không focus được, không có
  `aria-label` (Codex có nêu chúng không click được, nhưng không nêu vấn đề keyboard/label).

---

## PHẦN C — Nền tảng phải làm trước (Step 0)

### C1. Schema tối thiểu — làm cái này TRƯỚC MỌI THỨ

```ts
// types.js
Transaction  = { id, address, side:'buyer'|'listing'|'both', state, type, yearBuilt,
                 context: { value, source:'detected'|'manual', confidence }, contextVersion }

TxDocument   = { id, category, name, file, source:'library'|'upload', pages,
                 status:'processing'|'matched'|'needs-review'|'missing',
                 classification: { formCode, version, confidence }, uploadedAt, selected }

FormTemplate = { code, name, version, publisher:'CAR'|'Pinnacle', category,
                 description, requiredSignatures:[Role], supersedes }   // ← Forms Library, TÁCH RIÊNG

Field        = { id, label, value, group,
                 source: { docId, page, bbox:[x,y,w,h], extractedText, confidence },
                 editedBy, editedAt, previousValue }

Finding      = { id, ruleId, severity:'blocking'|'review'|'suggestion',
                 message, sides:[Source], resolution, resolvedBy, resolvedAt, contextVersion }

SignatureReq = { docId, page, bbox, role:'buyer1'|'buyer2'|'seller1'|'seller2'|'agent'|'broker',
                 kind:'signature'|'initial'|'date', signed:boolean, signerName }
```

**Tách hẳn 2 nguồn** (P0-#2 của Codex): `FORM_LIBRARY[]` (13 blank form + metadata) và
`transaction.documents[]` (file thật trong hồ sơ). Chúng không được dùng chung mảng.

Transaction document categories cần có (bổ sung đủ theo note của bạn):
Purchase Agreement · Counter Offers · Addenda · **Settlement Statement** · **Commission Sheet** ·
Agency Disclosure · Lead-Based Paint Disclosure · **Transfer Disclosure Statement** ·
**Natural Hazard Disclosure** · **Wood Destroying Pest Report** · **Escrow Instructions**

### C2. Lift state lên một `useReducer` duy nhất

```js
const [tx, dispatch] = useReducer(txReducer, initialTx);
// SELECT_TRANSACTION | SET_CONTEXT | UPLOAD_FILES | CLASSIFY_DONE | TOGGLE_DOC |
// RUN_AUDIT | EDIT_FIELD | RESOLVE_FINDING | ADD_DEADLINE | EDIT_DEADLINE |
// ADD_TASK | EDIT_TASK | SEND_EMAIL | AGENT_CONFIRM
```
Persist reducer state vào `localStorage` (B11). Sau bước này thì P0-#3, P0-#4, P1-#12, P2-#20
gần như tự động xong.

---

## PHẦN D — Thứ tự thi công đề xuất (thay cho thứ tự của Codex)

Codex xếp: tách data → upload → highlight → edit/save → signature → voice.
Vấn đề: upload (#2) phụ thuộc quyết định viewer (A1/A2), và edit/save (#4) phụ thuộc lift state (C2).

| # | Việc | Vì sao ở đây | Codex ref |
|---|---|---|---|
| **0** | Schema C1 + reducer C2 + localStorage | Mọi việc khác phụ thuộc | (thiếu) |
| **1** | Tách `FORM_LIBRARY` vs `transaction.documents`, thêm đủ category, **sửa nhãn `counter`** | Data đúng trước khi build UI | P0-#2, **B5** |
| **2** | Sửa nhanh: thumbnail padding, bỏ cap 8 trang, bỏ `slice(0,5)`, `open[0]` crash, đếm doc động | Rẻ, sửa được ngay, đang phá demo | **B3, B4**, P2-#9, **B9**, P2-#21 |
| **3** | **Quyết định viewer** → `<PdfPane>` mới (page-image + overlay) | Chặn cả highlight lẫn upload | **A1**, P0-#5 |
| **4** | Field/signature registry (`pdf-field-data`) + highlight bbox + scroll-to | Dùng chung cho #7 | P0-#5, **B13**, **A3** |
| **5** | `rules.js` + `runRules()`, số check sinh động | Không có cái này thì audit là giả | **B1** |
| **6** | Transaction context có state thật + confidence + re-run + `contextVersion` invalidate | Đầu vào của #5 | P1-#6, **B8** |
| **7** | Edit/Resolve lưu thật + conflict 2 phía + audit trail (ai/khi nào/before-after) | Đã có nền từ #0, #4 | P0-#3, **B2**, P2-#17 |
| **8** | Upload thật: multi-PDF, progress, processing→matched, upload vào đúng category | Cần #3 để hiển thị được | P0-#1, **A2**, **B12** |
| **9** | Add/Edit/Delete deadline + reminder config (kênh, người nhận, lịch) | | P0-#4, P1-#14, P2-#20 |
| **10** | Signature detection đầy đủ theo role + task editor + assignee/deadline | Dùng registry #4 | P1-#11, P1-#12 |
| **11** | Email: subject/body sửa được, attachment list, preview, confirm, success/fail | | P1-#13 |
| **12** | **Step 7 mới**: Agent confirm → packet → gửi parties + log | Flow bạn mô tả còn thiếu hẳn đoạn này | **B10** |
| **13** | Terms → policy fallback + "source unavailable → upload" | | P1-#10 |
| **14** | Forms Library UI (search, metadata, add to transaction, cảnh báo version) | | P1-#15 |
| **15** | Transaction list: search filter, new transaction, chọn tx thứ 2, loading/empty | | P2-#18 |
| **16** | PDF toolbar zoom/search hoạt động thật | Đã khả thi sau #3 | P2-#19 |
| **17** | Export audit report (PDF/CSV) | | P2-#17 |
| **18** | Voice prompt | Sau cùng, đúng như Codex | P1-#16 |
| **19** | A11y pass: bỏ button lồng button, pencil thành `<button aria-label>` | | **B14** |

**Ranh giới "demo được cho Marlene"**: hết mục **#7**. Từ #8 trở đi là hoàn thiện sản phẩm.

---

## PHẦN E — Bản tự kiểm trước khi demo

- [ ] Sửa `Year built` → 1990: warning LBP **biến mất**, task LBP **biến mất**
- [ ] Đổi `We represent` → Listing: bộ document requirement **đổi**
- [ ] Click "Appraisal contingency": PDF nhảy **RPA page 14** và **có khung highlight quanh đoạn 14B(2)**
- [ ] Click "Seller credit": mở đúng **Counter Offer**, không phải Contingency Removal
- [ ] Click warning compensation: thấy **cả 2 nguồn cạnh nhau** (2.5% và 2.48%) với 2 nút chọn
- [ ] Sửa compensation → `2.48%`: giá trị trên màn hình **đổi theo**, có dòng audit "changed by … at …"
- [ ] Thumbnail hiện đúng ảnh ở **cả 13** form, và cuộn được tới trang 25 của RPA
- [ ] Upload 3 PDF: có progress → Processing → Matched, doc count tăng
- [ ] Add deadline: **xuất hiện trong timeline**
- [ ] Task list liệt kê **từng role thiếu chữ ký** (buyer1/buyer2/seller/agent), click → đúng ô ký
- [ ] Reload trang giữa chừng: **không mất tiến độ**
- [ ] Tab-only từ đầu tới cuối không bị kẹt


---

# PHẦN F — Đọc lại feedback của Marlene: những gì CẢ Codex lẫn spec trên đều thiếu

Feedback của Marlene xác nhận phần lớn list đã có (voice #16, reminder #14, forms library #15,
prompt thêm form như LBP). Dưới đây chỉ là những điều **mới**, không nằm trong bất kỳ mục nào ở trên.

### F1. 🔴 "Too slow" mới là tiêu chuẩn cạnh tranh — không phải độ chính xác

> *"In PlanetRe they introduced an AI assistant, but my transaction coordinator says its too slow
> and she rather review every document manually — she can do it faster."*

Đối thủ trực tiếp **đã có AI** và **đã thua** vì chậm hơn người làm tay. Đây là yêu cầu sản phẩm
số 1, và nó **mâu thuẫn trực tiếp với B12** ở trên (mình đề xuất thêm độ trễ giả để cảm nhận được
AI đang chạy). Sửa lại B12:

- Không bao giờ giả lập chậm. Processing state chỉ để giải thích, không để câu giờ.
- Phải có **đối chứng thời gian hiển thị**: "Audited 13 documents · 24 checks · 8 seconds" và
  so sánh với baseline làm tay. Đây là câu chốt sale, không phải chi tiết trang trí.
- Benchmark thực tế cần đo: từ lúc chọn transaction tới lúc ra task list.

### F2. 🔴 Requirement set phụ thuộc **brokerage**, không chỉ state

> *"Each brokerage has a set of documents they must have in a real estate transaction,
> Pinnacle has theirs."*

Rule engine ở B1 mới chỉ có `{state, transactionType, representation, yearBuilt}`.
Phải thêm **`brokerage`** — và nó là chiều quan trọng nhất về mặt thương mại, vì compliance với
brokerage mới là lý do Marlene thuê TC. Ba lớp requirement phải tách bạch:

| Lớp | Nguồn | Ví dụ |
|---|---|---|
| Legal / State | luật CA + liên bang | LBP (pre-1978), TDS, NHD |
| Association | C.A.R. | RPA, AD, BRBC |
| **Brokerage** | **Pinnacle** | **bộ form bắt buộc riêng của Pinnacle** |
| Transaction-produced | phát sinh | addenda, amendments, extra reports |

UI phải nói rõ *tại sao* một document bị đòi — thuộc lớp nào.

### F3. 🔴 Vòng đời version của form là **value prop**, không phải chi tiết trong library

> *"She keeps me informed of new CAR forms that need to be part of the transaction and
> which ones we no longer need for the compliance with Pinnacle."*

Đây là một trong hai lý do chính Marlene trả $400–500. Codex xếp nó thành một dòng phụ trong
P1-#15 (Forms Library). Thực ra phải là **thông báo chủ động ở cấp transaction**:

- "C.A.R. đã phát hành <form> bản mới — transaction này đang dùng bản cũ."
- "Pinnacle không còn yêu cầu <form> — có thể bỏ."
- Cần metadata: `effectiveDate`, `retiredDate`, `supersedes`, `requiredBy: [brokerage|car|law]`.

### F4. 🔴 Resolve một finding phải sinh ra **document**, không chỉ sửa giá trị

> *"On the conflict of the compensation, to remedy that we usually use an addendum […]
> will I be able to add an addendum from the library list of documents?"*

Đây là câu hỏi trực tiếp của Marlene và **không có trong bất kỳ mục nào** của Codex.
Cách một agent thật xử lý mâu thuẫn 2.5% vs 2.48% **không phải** sửa con số trên màn hình —
mà là **tạo một addendum** cho hai bên ký. Nghĩa là popup Edit/Resolve (P0-#3) cần thêm nhánh:

```
Resolve finding →
  ├── Correct the value        (nhập tay — hiện có)
  ├── Use value from source B  (chọn 1 trong 2 nguồn — xem B2)
  ├── Add document from library  ← MỚI: Compensation Addendum / Extension / CR-B
  └── Mark as acceptable + lý do (ghi vào audit trail)
```
Nhánh "Add document" nối thẳng Forms Library (#15) vào audit findings — hai thứ Codex xếp
cách nhau 10 mục. Và Marlene hỏi luôn: **cái này voice prompt được không?**

### F5. 🟠 Contingency là một **state machine có document đầu ra**, không phải toggle reminder

Codex (#14) liệt kê per diem / notice to perform / extension như các nút bật-tắt. Marlene mô tả
một quy trình có hậu quả pháp lý:

```
pending ──(đúng hạn)──→ removed          → sinh CR-B (Contingency Removal)
   │
   ├──(buyer xin gia hạn)──→ extension requested
   │        ├── seller đồng ý      → extended    → sinh Extension Addendum
   │        ├── seller đồng ý + phí → extended    → + per-diem đã thoả thuận
   │        └── seller từ chối      → vẫn pending
   │
   └──(quá hạn)──→ expired → seller CÓ QUYỀN HUỶ HỢP ĐỒNG
                    └── Close of escrow quá hạn → Notice to Perform → có thể huỷ
```
Thông tin nghiệp vụ Marlene cho, cần đưa vào rule engine:
- Mặc định RPA là **17–20 ngày**; seller thường **rút ngắn** → không được hard-code 17.
- Ba contingency "lớn" khiến seller được huỷ: **Loan, Appraisal, Home inspection**.
- Close of escrow là mốc thứ tư, cơ chế khác (Notice to Perform).
→ Severity của reminder phải phản ánh "seller được huỷ nếu quá hạn", không phải chỉ "sắp đến hạn".

### F6. 🟠 Listing side là nhu cầu Marlene nói thẳng — demo chỉ có buyer side

> *"This would help me when I do listings, I usually prepare the listing agreement and also give
> my sellers disclosures to fill out, I think this will save time in not having to go back and get
> an additional signature."*

Giá trị bà ấy thấy ở listing side là **gom đủ chữ ký ngay từ đầu, không phải quay lại xin thêm**.
Đây chính là chức năng signature detection (#11) nhưng ở chiều listing — và transaction thứ hai
trong app ("1188 Laurel Canyon · Listing side") hiện **không bấm được** (P2-#18). Nên sửa
P2-#18 lên ưu tiên cao hơn: nó là đường vào của use case bà ấy quan tâm.

### F7. 🟠 Có hai persona, không phải một

> *"For the agents that do not pay TC this can be very helpful […] I think that this tool will also
> help transaction coordinators too."*

- **Agent tự làm giấy tờ** — tiết kiệm $400–500/giao dịch (con số neo giá do Marlene đưa ra).
- **TC** — người sẽ dùng hàng ngày, và là người đã từ chối AI của PlanetRE vì chậm.

Task list / email hiện chỉ có một người nhận là "Agent". Cần role TC: ai được giao task, ai nhận
reminder, ai confirm — và TC phải là người dùng chính của màn audit, agent là người duyệt cuối.

### F8. 🟡 PlanetRE là hệ thống nguồn

Copy trong app đã ghi "Start from a PlanetRE file" nhưng không có gì đằng sau. Cần quyết định:
import từ PlanetRE, hay thay thế nó? Marlene mô tả TC **upload documents vào PlanetRE** — nếu
Orqestron không đọc được từ đó thì thành một chỗ nhập liệu thứ hai, và persona TC sẽ từ chối.
