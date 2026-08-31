import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  Home,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { FIELD_MAP } from "./field-map";
import "./overhaul.css";

// Page renders: 170 DPI grayscale PNG (8-level palette) — sharp text, ~180KB a page.
// pdftoppm pads the page number to the width of the page count, so a 25-page form
// is page-01.png and a 5-page form is page-1.png.
// `full` = the reading pane, `thumb` = the 220px rail.
const pageImg = (doc, n, kind = "full") =>
  `/form-${kind === "thumb" ? "thumbs" : "pages"}/${doc.file.replace(
    ".pdf",
    "",
  )}/page-${doc.pages >= 10 ? String(n).padStart(2, "0") : n}.png`;
// C.A.R. / Pinnacle form codes — how agents actually refer to these documents.
const FORM_CODE = {
  rpa: "RPA",
  brbc: "BRBC",
  agency: "AD",
  sbsa: "SBSA",
  sfv: "SFV",
  bia: "BIA",
  fhda: "FHDA",
  counter: "CR-B",
  aba: "ABA",
  aeis: "AEIS",
  addenda: "ADDENDUM",
  prbs: "PRBS",
  rad: "RAD",
  lead: "FLD",
};
// What this transaction is required to contain, in the order the documents
// appear in a deal. A requirement is a CATEGORY — the library forms below are
// the sources that satisfy it. Missing ones are prompts, not errors: the
// agent decides what applies.
const REQS = [
  ["purchase", "Contract chain", "Purchase Agreement", "Main purchase contract", ["rpa"], ""],
  ["counters", "Contract chain", "Counter Offers", "Signed counter offers that modify the deal", [], "Terms in the audit cite Counter Offer 3 — add it so those terms have a source"],
  ["addenda", "Contract chain", "Addenda", "Signed amendments and addenda", ["addenda"], ""],
  ["contingency", "Contract chain", "Contingency Removal", "Signed removal of buyer contingencies", ["counter"], ""],
  ["representation", "Representation & compensation", "Buyer Representation & Compensation", "Brokerage compensation agreement", ["brbc"], ""],
  ["agency", "Representation & compensation", "Agency Disclosure", "California requires it before an offer is written", ["agency"], ""],
  ["commission", "Representation & compensation", "Commission Sheet", "Commission calculation sent to escrow", [], "Pinnacle asks for this on every closed transaction"],
  ["lead", "Disclosures & reports", "Lead-Based Paint Disclosure", "Federal rule for pre-1978 housing", [], "Property was built in 1956 — the federal rule applies"],
  ["tds", "Disclosures & reports", "Transfer Disclosure Statement", "California residential resale", [], "Standard on a California resale"],
  ["nhd", "Disclosures & reports", "Natural Hazard Disclosure", "California residential resale", [], "Standard on a California resale"],
  ["pest", "Disclosures & reports", "Wood Destroying Pest Report", "Customary for this county", [], "Customary in Los Angeles County"],
  ["advisories", "Disclosures & reports", "Statewide & local advisories", "Buyer/seller, local area, investigation, fair housing", ["sbsa", "sfv", "bia", "fhda"], ""],
  ["acks", "Disclosures & reports", "Broker acknowledgements", "Affiliated business, dual representation, realtor acknowledgement, affidavit", ["aba", "prbs", "rad", "aeis"], ""],
  ["settlement", "Closing", "Settlement Statement", "Final closing statement", [], "Needed before the file can be closed out"],
  ["escrow", "Closing", "Escrow Instructions", "Issued by escrow at opening", [], "Escrow usually issues these at opening"],
].map((x) => ({
  id: x[0],
  group: x[1],
  name: x[2],
  desc: x[3],
  docs: x[4],
  suggest: x[5],
  applies: true,
}));
const REQ_GROUPS = [
  "Contract chain",
  "Representation & compensation",
  "Disclosures & reports",
  "Closing",
];

// Signing dates drive precedence: a later signed document supersedes an
// earlier one. A source with no date cannot supersede anything.
const SIGNED = {
  rpa: "2026-08-02",
  brbc: "2026-07-28",
  sbsa: "2026-08-02",
  sfv: "2026-08-02",
  bia: "2026-08-02",
  fhda: "2026-08-02",
  counter: "2026-08-05",
  aba: "2026-08-02",
  aeis: "2026-08-02",
  addenda: "2026-08-12",
  prbs: "2026-08-02",
  rad: "2026-08-02",
  // agency: signed page was scanned without a date
};
// The Pinnacle Addendum arrived as a flat scan — no text layer, so nothing
// in it can be cited. This is the document that would settle the
// compensation conflict, which is exactly why it has to be fixed first.
const READABLE = { addenda: false };
const docs0 = [
  [
    "rpa",
    "California Residential Purchase Agreement",
    "RPA_California_Residential_Purchase_Agreement-1.4.pdf",
    "Purchase contract",
    1,
    25,
  ],
  [
    "brbc",
    "Buyer Representation & Broker Compensation Agreement",
    "BRBC_Buyer_Representation_and_Broker_Compensation_Agreement-1.3.pdf",
    "Representation",
    1,
    13,
  ],
  [
    "agency",
    "Disclosure Regarding Real Estate Agency Relationship",
    "AD_Disclosure_Real_Estate_Agency_Relationship_Buyer-1.2.pdf",
    "Disclosure",
    1,
    3,
  ],
  [
    "sbsa",
    "Statewide Buyer and Seller Advisory",
    "SBSA_Statewide_Buyer_and_Seller_Advisory-1.3.pdf",
    "Advisory",
    1,
    15,
  ],
  [
    "sfv",
    "Local Area Disclosure and Advisory",
    "SFV_Local_Area_Disclosure_and_Advisory-1.0.pdf",
    "Disclosure",
    1,
    5,
  ],
  [
    "bia",
    "Buyer’s Investigation Advisory",
    "10_BIA_Buyers_Investigation_Advisory_6-1.2.pdf",
    "Advisory",
    1,
    2,
  ],
  [
    "fhda",
    "Fair Housing and Discrimination Advisory",
    "12_FHDA_Fair_Housing_Discrimination_Advisory-1.1.pdf",
    "Advisory",
    1,
    2,
  ],
  [
    "counter",
    "Buyer Contingency Removal",
    "53_CR-B_Buyer_Contingency_Removal-1.2.pdf",
    "Contingency",
    1,
    1,
  ],
  [
    "aba",
    "Affiliated Business Arrangement Disclosure",
    "ABA_Affiliated_Business_Arrangement_Disclosure-1.0.pdf",
    "Disclosure",
    1,
    1,
  ],
  [
    "aeis",
    "Buyer’s Affidavit",
    "AEIS_Buyers_Affidavit-1.0.pdf",
    "Affidavit",
    1,
    1,
  ],
  [
    "addenda",
    "Pinnacle Addendum",
    "PINNACLE_Addendum-1.0.pdf",
    "Addendum",
    1,
    1,
  ],
  [
    "prbs",
    "Possible Representation of More Than One Buyer or Seller",
    "PRBS_Possible_Representation_More_Than_One-1.2.pdf",
    "Disclosure",
    1,
    1,
  ],
  [
    "rad",
    "Realtor Acknowledgment and Disclosure",
    "RAD_Realtor_Acknowledgment_and_Disclosure-1.0.pdf",
    "Disclosure",
    1,
    1,
  ],
  ["lead", "Lead-Based Paint Disclosure", "", "Required disclosure", 0, 0],
].map((x) => ({
  code: FORM_CODE[x[0]],
  id: x[0],
  name: x[1],
  file: x[2],
  type: x[3],
  present: !!x[4],
  selected: !!x[4] && READABLE[x[0]] !== false,
  pages: x[5],
  // a source is only evidence if the engine can read it, and it can only
  // supersede another document if we know when it was signed
  signed: SIGNED[x[0]] || "",
  readable: READABLE[x[0]] !== false,
  origin: "library",
  status: x[4] ? "matched" : "missing",
  confidence: x[4] ? 90 + ((x[0].length * 7) % 9) : 0,
}));
const groups = [
  {
    title: "Property details",
    fields: [
      [
        "address",
        "Property address",
        "4024 Presidio Dr, Los Angeles, CA 90008",
        "rpa",
        1,
        "Section 1A · Property",
      ],
      [
        "year",
        "Year built",
        "1956",
        "rpa",
        1,
        "RPA property data",
        "warn",
        "Property was built before 1978. Lead-Based Paint Disclosure is required.",
      ],
      [
        "price",
        "Purchase price",
        "$1,250,000",
        "rpa",
        2,
        "Section 3A · Purchase Price",
      ],
    ],
  },
  {
    title: "Parties & representation",
    fields: [
      [
        "buyer",
        "Buyer",
        "Elena & Luis Marquez",
        "rpa",
        1,
        "Section 1B · Buyer",
      ],
      [
        "agent",
        "Buyer agent",
        "Marlene James · Pinnacle Estate Properties",
        "agency",
        1,
        "Agency Disclosure · Page 1",
      ],
      [
        "signature",
        "Buyer signature",
        "Missing · Elena Marquez",
        "agency",
        2,
        "Buyer acknowledgement",
        "warn",
        "Elena Marquez has not signed the Agency Disclosure.",
      ],
    ],
  },
  {
    title: "Financing & compensation",
    fields: [
      [
        "loan",
        "Loan amount",
        "$1,000,000 · Conventional",
        "rpa",
        3,
        "Section 3D · Financing",
      ],
      [
        "comp",
        "Buyer broker compensation",
        "2.5%",
        "brbc",
        3,
        "BRBC · Page 3 · Compensation",
        "warn",
        "RPA addendum states 2.48%. Difference equals $250.",
      ],
      [
        "credit",
        "Seller credit",
        "$15,000",
        "counter",
        1,
        "Counter Offer 3 · Item 2",
      ],
    ],
  },
  {
    title: "Terms",
    fields: [
      [
        "inspection",
        "Inspection contingency",
        "10 days · Sep 5, 2026",
        "counter",
        1,
        "Counter Offer 3 · Item 4",
      ],
      [
        "appraisal",
        "Appraisal contingency",
        "17 days · Sep 12, 2026",
        "rpa",
        14,
        "Paragraph 14B(2)",
      ],
      [
        "loan-date",
        "Loan contingency",
        "21 days · Sep 16, 2026",
        "rpa",
        14,
        "Paragraph 14B(1)",
      ],
      [
        "close",
        "Close of escrow",
        "Sep 25, 2026",
        "counter",
        1,
        "Counter Offer 3 · Item 6",
      ],
    ],
  },
];
const tasks0 = [
  {
    id: "signature",
    title: "Get Elena Marquez\u2019s signature",
    detail: "Buyer acknowledgement is unsigned",
    assignee: "Elena Marquez",
    due: "2026-08-31",
    doc: "agency",
    field: "signature",
  },
  {
    id: "lead",
    title: "Upload and sign Lead-Based Paint Disclosure",
    detail: "Property built in 1956 \u00b7 California requirement",
    assignee: "Buyer + Seller",
    due: "2026-08-31",
    doc: "",
    field: "",
  },
  {
    id: "comp",
    title: "Confirm broker compensation amount",
    detail: "Resolve 2.50% vs 2.48% difference",
    assignee: "Marlene James",
    due: "2026-09-02",
    doc: "brbc",
    field: "comp",
  },
  {
    id: "inspection",
    title: "Remove or extend inspection contingency",
    detail: "Seller may cancel if not removed on time",
    assignee: "Marlene James",
    due: "2026-09-05",
    doc: "rpa",
    field: "inspection",
  },
];
const dates0 = [
  [
    "inspection",
    "Home inspection contingency",
    "Sep 5, 2026",
    "Counter Offer 3 · Item 4",
  ],
  [
    "appraisal",
    "Appraisal contingency",
    "Sep 12, 2026",
    "RPA · Paragraph 14B(2)",
  ],
  ["loan", "Loan contingency", "Sep 16, 2026", "RPA · Paragraph 14B(1)"],
  ["close", "Close of escrow", "Sep 25, 2026", "Counter Offer 3 · Item 6"],
];
function App() {
  const [step, setStep] = useState(1),
    [docs, setDocs] = useState(docs0),
    [active, setActive] = useState("rpa"),
    [page, setPage] = useState(1),
    [focus, setFocus] = useState(),
    [resolved, setResolved] = useState([]),
    [dates, setDates] = useState(dates0),
    [tasks, setTasks] = useState(tasks0),
    [reqs, setReqs] = useState(REQS),
    [modal, setModal] = useState(),
    [sent, setSent] = useState(false);
  // Adding a source: the file lands immediately as `processing`, then the
  // classifier resolves it. `into` pins it to a category the user chose.
  const addSources = (files, into) => {
    const added = [...files].map((f, i) => ({
      code: into ? FORM_CODE[into] : "NEW",
      id: `up-${Date.now()}-${i}`,
      name: f.name.replace(/\.[^.]+$/, ""),
      file: f.name,
      url: URL.createObjectURL(f),
      type: into ? docs.find((d) => d.id === into)?.type : "Uploaded",
      into: into || "",
      present: true,
      selected: false,
      pages: 0,
      signed: "",
      readable: true,
      origin: "upload",
      status: "processing",
      confidence: 0,
    }));
    setDocs([...docs, ...added]);
    const ids = added.map((a) => a.id);
    setTimeout(() => {
      setDocs((cur) =>
        cur.map((d) =>
          ids.includes(d.id)
            ? {
                ...d,
                status: d.into ? "matched" : "needs-review",
                selected: true,
                confidence: d.into ? 97 : 71,
              }
            : d,
        ),
      );
    }, 900);
  };
  const patchDoc = (id, patch) =>
    setDocs((cur) => cur.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const go = (n) => {
      setStep(n);
      scrollTo(0, 0);
    },
    pdf = { docs, active, setActive, page, setPage, focus, setFocus };
  return (
    <>
      <Top step={step} />
      {step === 1 && <Transactions next={() => go(2)} />}{" "}
      {step === 2 && (
        <Intake
          {...pdf}
          addSources={addSources}
          back={() => go(1)}
          next={() => go(3)}
        />
      )}{" "}
      {step === 3 && (
        <Classify
          docs={docs}
          setDocs={setDocs}
          reqs={reqs}
          setReqs={setReqs}
          addSources={addSources}
          patchDoc={patchDoc}
          setModal={setModal}
          back={() => go(2)}
          next={() => go(4)}
        />
      )}{" "}
      {step === 4 && (
        <Sources
          docs={docs}
          setDocs={setDocs}
          reqs={reqs}
          addSources={addSources}
          patchDoc={patchDoc}
          back={() => go(3)}
          next={() => go(5)}
        />
      )}{" "}
      {step === 5 && (
        <Audit
          {...pdf}
          resolved={resolved}
          setModal={setModal}
          back={() => go(4)}
          next={() => go(6)}
        />
      )}{" "}
      {step === 6 && (
        <Timeline
          {...pdf}
          dates={dates}
          setDates={setDates}
          setModal={setModal}
          back={() => go(5)}
          next={() => go(7)}
        />
      )}{" "}
      {step === 7 && (
        <Tasks
          docs={docs}
          tasks={tasks}
          setTasks={setTasks}
          setModal={setModal}
          sent={sent}
          setSent={setSent}
          back={() => go(6)}
        />
      )}{" "}
      {modal && (
        <Editor
          data={modal}
          docs={docs}
          close={() => setModal()}
          remove={() => {
            setTasks(tasks.filter((t) => t.id !== modal.task.id));
            setModal();
          }}
          save={(values) => {
            if (modal.kind === "req") {
              setReqs([
                ...reqs,
                {
                  id: `req-${Date.now()}`,
                  group: values.group || "Disclosures & reports",
                  name: values.name,
                  desc: values.desc || "Added for this transaction",
                  docs: [],
                  suggest: "",
                  applies: true,
                },
              ]);
            } else if (modal.kind === "task") {
              const t = { ...modal.task, ...values };
              setTasks(
                tasks.some((x) => x.id === t.id)
                  ? tasks.map((x) => (x.id === t.id ? t : x))
                  : [...tasks, t],
              );
            } else if (modal.id) {
              setResolved([...new Set([...resolved, modal.id])]);
            }
            setModal();
          }}
        />
      )}
    </>
  );
}
function Top({ step }) {
  return (
    <header className="top">
      <div className="brand">
        <ShieldCheck />
        <b>Orqestron</b>
        <small>AUDIT</small>
      </div>
      <div className="steps">
        <span>Step {step} of 7</span>
        <div>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <i className={n <= step ? "on" : ""} key={n} />
          ))}
        </div>
      </div>
      <button onClick={() => location.reload()}>Start over</button>
    </header>
  );
}
const Btn = ({ children, onClick, secondary, disabled }) => (
  <button
    className={secondary ? "btn secondary" : "btn"}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
const Foot = ({ back, next, label, disabled }) => (
  <footer className="foot">
    <button className="back" onClick={back}>
      <ArrowLeft /> Back
    </button>
    <Btn onClick={next} disabled={disabled}>
      {label}
      <ArrowRight />
    </Btn>
  </footer>
);
function Transactions({ next }) {
  return (
    <main className="page">
      <Intro
        k="TRANSACTION INTAKE"
        h="Choose a transaction to audit"
        p="Start from a PlanetRE file. Every document and finding stays linked to its original source."
      />
      <div className="tools">
        <label>
          <Search />
          <input placeholder="Search address, client or MLS…" />
        </label>
        <Btn secondary>
          <Plus />
          New transaction
        </Btn>
      </div>
      <div className="transactions">
        <button onClick={next} className="transaction selected">
          <Mark>
            <Home />
          </Mark>
          <div>
            <h3>4024 Presidio Dr</h3>
            <p>Elena & Luis Marquez · Buyer side</p>
            <small>
              <MapPin />
              Los Angeles, CA · Close Sep 25
            </small>
          </div>
          <b>13 files</b>
          <em>Under contract</em>
          <ArrowRight />
        </button>
        <button className="transaction">
          <Mark>
            <Building2 />
          </Mark>
          <div>
            <h3>1188 Laurel Canyon Blvd</h3>
            <p>Nguyen Family · Listing side</p>
            <small>
              <MapPin />
              Studio City, CA
            </small>
          </div>
          <b>6 files</b>
          <em>Active listing</em>
          <ArrowRight />
        </button>
      </div>
    </main>
  );
}
const Mark = ({ children }) => <span className="mark">{children}</span>;
const Intro = ({ k, h, p }) => (
  <div className="intro">
    <span className="kicker">{k}</span>
    <h1>{h}</h1>
    <p>{p}</p>
  </div>
);
function Intake({
  docs,
  active,
  setActive,
  page,
  setPage,
  focus,
  addSources,
  back,
  next,
}) {
  return (
    <main className="split">
      <section className="panel">
        <Intro
          k="REVIEW FILE"
          h="Confirm the transaction context"
          p="We detected these details from the transaction. Change anything that doesn’t look right."
        />
        <div className="context">
          <Select l="Transaction type" v="Residential purchase" />
          <Select l="State" v="California" />
          <Select l="We represent" v="Buyer" />
          <label className="field">
            <span>Year built</span>
            <div>
              <input defaultValue="1956" />
              <Pencil />
            </div>
            <small>
              <CircleAlert />
              Pre-1978 disclosure rules apply
            </small>
          </label>
        </div>
        <div className="subhead">
          <div>
            <h2>Files in this transaction</h2>
            <p>
              {docs.filter((d) => d.present).length} Pinnacle forms attached
            </p>
          </div>
          <UploadBtn onFiles={addSources} />
        </div>
        <div className="files">
          {docs
            .filter((d) => d.present)
            .map((d) => (
              <button
                className={active === d.id ? "active" : ""}
                onClick={() => {
                  setActive(d.id);
                  setPage(1);
                }}
                key={d.id}
              >
                <FileText />
                <span>
                  <b>{d.name}</b>
                  <small>
                    {d.file} · {d.pages} pages
                  </small>
                </span>
                <CheckCircle2 />
              </button>
            ))}
        </div>
        <Foot back={back} next={next} label="Start intake" />
      </section>
      <Pdf {...{ docs, active, setActive, page, setPage, focus }} />
    </main>
  );
}
function Select({ l, v }) {
  return (
    <label className="field">
      <span>{l}</span>
      <div>
        <select defaultValue={v}>
          <option>{v}</option>
          <option>Choose manually</option>
        </select>
        <ChevronDown />
      </div>
    </label>
  );
}
const UploadBtn = ({ onFiles, into, label = "Upload more", small }) => (
  <label className={`btn secondary upload${small ? " small" : ""}`}>
    <Upload />
    {label}
    <input
      type="file"
      multiple
      accept="application/pdf,image/*"
      onChange={(e) => {
        if (e.target.files.length) onFiles(e.target.files, into);
        e.target.value = "";
      }}
    />
  </label>
);
function Classify({
  docs,
  setDocs,
  reqs,
  setReqs,
  addSources,
  patchDoc,
  setModal,
  back,
  next,
}) {
  const [expanded, setExpanded] = useState([]);
  const sourcesFor = (q) => docs.filter((d) => q.docs.includes(d.id) || d.into === q.id);
  const stateOf = (q) => {
    if (!q.applies) return "off";
    const src = sourcesFor(q);
    if (!src.length) return "none";
    if (src.some((d) => d.status === "processing")) return "processing";
    return src.some((d) => d.readable) ? "ready" : "unread";
  };
  const active = reqs.filter((r) => r.applies);
  const ready = active.filter((r) => stateOf(r) === "ready");
  const chosen = docs.filter((d) => d.selected && d.readable);
  const toggleReq = (id) =>
    setReqs(reqs.map((r) => (r.id === id ? { ...r, applies: !r.applies } : r)));
  return (
    <main className="page">
      <div className="intro-row">
        <Intro
          k="STEP 1 OF 2 · COMPLETENESS"
          h="Match the file against what this transaction needs"
          p="California · Residential purchase · Buyer side. We mapped the documents already in the transaction onto each requirement. Untick anything that does not apply and upload whatever is still missing."
        />
        <strong>
          {ready.length}/{active.length}
          <small>with a source</small>
        </strong>
      </div>

      <div className="reqs">
        <header className="reqhead">
          <div>
            <h2>Required documents</h2>
            <p>
              {active.length} apply to this transaction · {chosen.length} source
              {chosen.length === 1 ? "" : "s"} selected for the audit
            </p>
          </div>
          <Btn
            secondary
            onClick={() =>
              setModal({ kind: "req", title: "Add requirement", task: null })
            }
          >
            <Plus />
            Add requirement
          </Btn>
        </header>

        {REQ_GROUPS.concat(
          [...new Set(reqs.map((r) => r.group))].filter(
            (g) => !REQ_GROUPS.includes(g),
          ),
        ).map((group) => {
          const rows = reqs.filter((r) => r.group === group);
          if (!rows.length) return null;
          return (
            <section key={group}>
              <h3 className="reqgroup">{group}</h3>
              {rows.map((q) => {
                const st = stateOf(q);
                const src = sourcesFor(q);
                const open = expanded.includes(q.id);
                return (
                  <article className={`req ${st}`} key={q.id}>
                    <div className="reqrow">
                      <button
                        className={q.applies ? "check on" : "check"}
                        aria-label={`${q.applies ? "Remove" : "Add"} ${q.name}`}
                        onClick={() => toggleReq(q.id)}
                      >
                        {q.applies && <Check />}
                      </button>
                      <div>
                        <h4>{q.name}</h4>
                        <p>{q.desc}</p>
                        {q.applies && st === "none" && q.suggest && (
                          <small className="suggest">
                            <CircleAlert />
                            {q.suggest}
                          </small>
                        )}
                      </div>
                      <span className={`reqstate ${st}`}>
                        {st === "off"
                          ? "Not applicable"
                          : st === "ready"
                            ? `${src.length} source${src.length === 1 ? "" : "s"}`
                            : st === "processing"
                              ? "Processing"
                              : st === "unread"
                                ? "Not readable yet"
                                : "No source yet"}
                      </span>
                      {q.applies && st === "none" ? (
                        <UploadBtn
                          small
                          onFiles={addSources}
                          into={q.id}
                          label="Add source"
                        />
                      ) : (
                        <button
                          className={`expand-arrow ${open ? "open" : ""}`}
                          aria-expanded={open}
                          aria-label={`${open ? "Collapse" : "Expand"} ${q.name}`}
                          disabled={!q.applies}
                          onClick={() =>
                            setExpanded(
                              open
                                ? expanded.filter((id) => id !== q.id)
                                : [...expanded, q.id],
                            )
                          }
                        >
                          <ChevronRight />
                        </button>
                      )}
                    </div>
                    {open && q.applies && (
                      <div className="reqsources">
                        {src.map((d) => (
                          <SourceRow
                            d={d}
                            key={d.id}
                            setDocs={setDocs}
                            docs={docs}
                            patchDoc={patchDoc}
                            addSources={addSources}
                            into={q.id}
                          />
                        ))}
                        <UploadBtn
                          small
                          onFiles={addSources}
                          into={q.id}
                          label="Add another source"
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
        <footer className="reqfoot">
          <b>{active.length}</b> required documents for this audit ·{" "}
          <b>{ready.length}</b> already have a source
        </footer>
      </div>

      <Foot
        back={back}
        next={next}
        label={`Continue with ${active.length} requirement${active.length === 1 ? "" : "s"}`}
        disabled={!active.length}
      />
    </main>
  );
}
function SourceRow({ d, docs, setDocs, patchDoc, addSources, into }) {
  return (
    <div className={`srcrow ${d.readable ? "" : "unread"}`}>
      <button
        className={d.selected ? "check on" : "check"}
        aria-label={`${d.selected ? "Exclude" : "Include"} ${d.file}`}
        disabled={!d.readable || d.status === "processing"}
        onClick={() =>
          setDocs(
            docs.map((x) =>
              x.id === d.id ? { ...x, selected: !x.selected } : x,
            ),
          )
        }
      >
        {d.selected && <Check />}
      </button>
      <FileText />
      <div>
        <b>{d.name}</b>
        <small>
          {d.file}
          {d.pages ? ` · ${d.pages} pages` : ""}
          {d.confidence ? ` · AI match ${d.confidence}%` : ""}
        </small>
      </div>
      <label className="setdate">
        <span>Signed</span>
        <input
          type="date"
          value={d.signed}
          onChange={(e) => patchDoc(d.id, { signed: e.target.value })}
        />
      </label>
      {d.status === "processing" ? (
        <span className="reqstate processing">Reading…</span>
      ) : d.readable ? (
        <a href={d.url || `/forms/${d.file}`} target="_blank" rel="noreferrer">
          Open
        </a>
      ) : (
        <Btn
          secondary
          onClick={() => {
            patchDoc(d.id, { status: "processing" });
            setTimeout(
              () =>
                patchDoc(d.id, {
                  readable: true,
                  selected: true,
                  status: "matched",
                  pages: d.pages || 1,
                  confidence: 88,
                }),
              1100,
            );
          }}
        >
          Read this scan
        </Btn>
      )}
    </div>
  );
}
function Sources({ docs, setDocs, reqs, addSources, patchDoc, back, next }) {
  const groupOf = (d) => {
    const q = reqs.find((r) => r.docs.includes(d.id) || d.into === r.id);
    return q ? q.group : "Other evidence";
  };
  const present = docs.filter((d) => d.present);
  const groups = REQ_GROUPS.concat("Other evidence").filter((g) =>
    present.some((d) => groupOf(d) === g),
  );
  const readable = present.filter((d) => d.readable);
  const chosen = present.filter((d) => d.selected && d.readable);
  const unread = present.filter((d) => !d.readable);
  const undated = chosen.filter((d) => !d.signed);
  const toggle = (d) =>
    d.readable &&
    setDocs(
      docs.map((x) => (x.id === d.id ? { ...x, selected: !x.selected } : x)),
    );
  return (
    <main className="page">
      <div className="intro-row">
        <Intro
          k="STEP 2 OF 2 · EVIDENCE"
          h="Choose what the audit compares"
          p="Every selected document becomes evidence the engine can quote. Add anything a term depends on, even if it is not a required document."
        />
        <strong>
          {chosen.length}
          <small>sources selected</small>
        </strong>
      </div>

      <div className="reqs">
        <header className="reqhead">
          <div>
            <h2>Source documents</h2>
            <p>
              {readable.length} of {present.length} readable
              {unread.length
                ? ` · ${unread.length} still to be read`
                : ""}
            </p>
          </div>
          <UploadBtn onFiles={addSources} label="Add source" />
        </header>

        {groups.map((g) => (
          <section key={g}>
            <h3 className="reqgroup">{g}</h3>
            {present
              .filter((d) => groupOf(d) === g)
              .map((d) => (
                <div
                  className={`evrow${d.readable ? "" : " unread"}`}
                  key={d.id}
                >
                  <button
                    className={d.selected ? "check on" : "check"}
                    aria-label={`${d.selected ? "Exclude" : "Include"} ${d.name}`}
                    disabled={!d.readable || d.status === "processing"}
                    onClick={() => toggle(d)}
                  >
                    {d.selected && <Check />}
                  </button>
                  <FileText />
                  <div>
                    <b>{d.name}</b>
                    <small className="fname">{d.file}</small>
                  </div>
                  {d.signed ? (
                    <span className="signed">Signed {d.signed}</span>
                  ) : (
                    <label className="setdate">
                      <span>Signing date</span>
                      <input
                        type="date"
                        value={d.signed}
                        onChange={(e) =>
                          patchDoc(d.id, { signed: e.target.value })
                        }
                      />
                    </label>
                  )}
                  {d.status === "processing" ? (
                    <span className="reqstate processing">Reading…</span>
                  ) : d.readable ? (
                    <span className="reqstate ready">Readable</span>
                  ) : (
                    <Btn
                      secondary
                      onClick={() => {
                        patchDoc(d.id, { status: "processing" });
                        setTimeout(
                          () =>
                            patchDoc(d.id, {
                              readable: true,
                              selected: true,
                              status: "matched",
                              pages: d.pages || 1,
                              confidence: 88,
                            }),
                          1100,
                        );
                      }}
                    >
                      Read this scan
                    </Btn>
                  )}
                </div>
              ))}
          </section>
        ))}
        <footer className="reqfoot">
          <b>{chosen.length}</b> source{chosen.length === 1 ? "" : "s"} will be
          compared against each other
          {undated.length
            ? ` · ${undated.length} without a signing date cannot supersede an earlier version`
            : ""}
        </footer>
      </div>

      <div className="notice">
        <FileCheck2 />
        <p>
          <b>Sources are one shared pool.</b> The engine works out for itself
          which documents are relevant to each comparison — a single addendum
          can support several terms at once. A document with no signing date
          cannot supersede an earlier one, and one that cannot be read is not
          evidence at all.
        </p>
      </div>

      <Foot
        back={back}
        next={next}
        label={`Start audit with ${chosen.length} source${chosen.length === 1 ? "" : "s"}`}
        disabled={!chosen.length}
      />
    </main>
  );
}
function Audit({
  docs,
  active,
  setActive,
  page,
  setPage,
  focus,
  setFocus,
  resolved,
  setModal,
  back,
  next,
}) {
  const warns = groups.flatMap((g) => g.fields).filter((f) => f[6]),
    left = warns.filter((f) => !resolved.includes(f[0])).length;
  const jump = (f) => {
    const m = FIELD_MAP[f[0]];
    if (!m) return;
    setActive(m.doc);
    setPage(m.page);
    setFocus(f[0]);
  };
  return (
    <main className="split">
      <section className="panel audit">
        <div className="audithead">
          <Intro
            k="AUDIT RESULTS"
            h="Review transaction details"
            p="Click any field to jump to the exact source in the PDF."
          />
          <strong>
            24<small>checks verified</small>
          </strong>
        </div>
        {left > 0 ? (
          <div className="warning">
            <CircleAlert />
            <p>
              <b>
                {left} item{left === 1 ? "" : "s"} need
                {left === 1 ? "s" : ""} attention.
              </b>{" "}
              Resolve all warnings before confirming.
            </p>
          </div>
        ) : (
          <div className="notice ok">
            <CheckCircle2 />
            <p>
              <b>Everything checks out.</b> No conflicts or missing values left
              in this transaction.
            </p>
          </div>
        )}
        {groups.map((g) => (
          <section className="group" key={g.title}>
            <h2>{g.title}</h2>
            {g.fields.map((f) => {
              const warn = f[6] && !resolved.includes(f[0]);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  className={warn ? "row warn" : "row"}
                  onClick={() => jump(f)}
                  onKeyDown={(e) => e.key === "Enter" && jump(f)}
                  key={f[0]}
                >
                  <span>{f[1]}</span>
                  <b>{f[2]}</b>
                  <small>{FIELD_MAP[f[0]]?.label || f[5]}</small>
                  {warn ? (
                    <em>
                      <CircleAlert />
                      Review
                    </em>
                  ) : (
                    <CheckCircle2 />
                  )}
                  <button
                    aria-label={`Edit ${f[1]}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({
                        id: f[0],
                        title: f[1],
                        value: f[2],
                        warning: f[7],
                      });
                    }}
                  >
                    <Pencil />
                  </button>
                </div>
              );
            })}
          </section>
        ))}
        <Foot
          back={back}
          next={next}
          label="Confirm audit"
          disabled={left > 0}
        />
      </section>
      <Pdf {...{ docs, active, setActive, page, setPage, focus }} />
    </main>
  );
}
function Pdf({ docs, active, setActive, page, setPage, focus }) {
  const open = docs.filter((d) => d.present && d.selected),
    doc =
      docs.find((d) => d.id === active && d.present) ||
      open[0] ||
      docs.find((d) => d.present);
  const [zoom, setZoom] = useState(100);
  const hlRef = useRef(null);
  const hit = focus ? FIELD_MAP[focus] : null;
  const shown = hit && doc && hit.doc === doc.id && hit.page === page ? hit : null;
  useEffect(() => {
    if (shown && hlRef.current)
      hlRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus, active, page, shown]);
  if (!doc) return <aside className="pdf" />;
  return (
    <aside className="pdf">
      <div className="tabs">
        {open.map((d) => (
          <button
            className={d.id === doc.id ? "active" : ""}
            onClick={() => {
              setActive(d.id);
              setPage(1);
            }}
            key={d.id}
            title={d.name}
          >
            <FileText />
            {d.code}
          </button>
        ))}
      </div>
      <div className="bar">
        <button
          className="zoom"
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(60, zoom - 20))}
        >
          −
        </button>
        <b>{zoom}%</b>
        <button
          className="zoom"
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(220, zoom + 20))}
        >
          +
        </button>
        <small>
          <b>{doc.name}</b> · page {page} of {doc.pages}
        </small>
        <a
          href={`/forms/${doc.file}`}
          target="_blank"
          rel="noreferrer"
          title={doc.file}
        >
          Open original
        </a>
      </div>
      <div className="stage">
        <div className="pageview">
          <div className="pagewrap" style={{ width: `${zoom}%` }}>
            <img src={pageImg(doc, page)} alt={`${doc.name}, page ${page}`} />
            {shown && (
              <span
                ref={hlRef}
                className="hl"
                style={{
                  left: `${shown.rect[0]}%`,
                  top: `${shown.rect[1]}%`,
                  width: `${shown.rect[2]}%`,
                  height: `${shown.rect[3]}%`,
                }}
              >
                <em>
                  <ShieldCheck />
                  {shown.label}
                </em>
              </span>
            )}
          </div>
        </div>
        <div className="thumbs">
          {Array.from({ length: doc.pages }).map((_, i) => (
            <button
              className={page === i + 1 ? "on" : ""}
              onClick={() => setPage(i + 1)}
              key={i}
            >
              <img
                src={pageImg(doc, i + 1, "thumb")}
                alt={`Page ${i + 1}`}
                loading="lazy"
              />
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
// Fixed "today" so the Sep 2026 demo dates always read correctly.
// Swap for `new Date()` when this runs on real transactions.
const TODAY = new Date(2026, 7, 31);
const fmt = (d) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const daysUntil = (s) => Math.round((new Date(s) - TODAY) / 86400000);
const dueLabel = (iso) => {
  const d = daysUntil(iso);
  return d === 0 ? "Today" : d === 1 ? "Tomorrow" : fmt(new Date(iso + "T00:00"));
};
function Timeline({
  docs,
  active,
  setActive,
  page,
  setPage,
  focus,
  setFocus,
  dates,
  setModal,
  back,
  next,
}) {
  return (
    <main className="split">
      <section className="panel">
        <div className="subhead">
          <Intro
            k="DEADLINES"
            h="Review your timeline"
            p="Dates come from the latest signed agreement, counter offers and addenda."
          />
          <Btn
            secondary
            onClick={() => setModal({ title: "Add deadline", kind: "date" })}
          >
            <Plus />
            Add deadline
          </Btn>
        </div>
        <ol className="timeline">
          <li className="today">
            <span className="node" aria-hidden="true" />
            <div className="today-row">
              <b>Today</b>
              <span>{fmt(TODAY)}</span>
            </div>
          </li>
          {dates.map((t, i) => {
            const d = daysUntil(t[2]);
            return (
              <li className={d <= 7 ? "soon" : ""} key={t[0]}>
                <span className="node">{i + 1}</span>
                <button
                  onClick={() => {
                    const m = FIELD_MAP[t[0] === "loan" ? "loan-date" : t[0]];
                    if (!m) return;
                    setActive(m.doc);
                    setPage(m.page);
                    setFocus(t[0] === "loan" ? "loan-date" : t[0]);
                  }}
                >
                  <div>
                    <h3>{t[1]}</h3>
                    <p>{t[2]}</p>
                    <small>
                      {FIELD_MAP[t[0] === "loan" ? "loan-date" : t[0]]?.label ||
                        t[3]}
                    </small>
                  </div>
                  <em className="when">
                    {d < 0
                      ? `${-d}d overdue`
                      : d === 0
                        ? "Today"
                        : `in ${d} day${d === 1 ? "" : "s"}`}
                  </em>
                  <em>
                    <Clock3 />
                    7d · 3d · 1d
                  </em>
                  <Pencil />
                </button>
              </li>
            );
          })}
        </ol>
        <div className="notice">
          <Mail />
          <p>
            Reminder schedule will be prepared for the Agent to approve. No
            messages are sent automatically.
          </p>
        </div>
        <Foot back={back} next={next} label="Confirm timeline" />
      </section>
      <Pdf {...{ docs, active, setActive, page, setPage, focus }} />
    </main>
  );
}
function Tasks({ docs, tasks, setTasks, setModal, sent, setSent, back }) {
  const [done, setDone] = useState([]);
  const blank = () => ({
    id: `task-${Date.now()}`,
    title: "",
    detail: "",
    assignee: "",
    due: new Date(TODAY.getTime() + 86400000).toISOString().slice(0, 10),
    doc: "",
  });
  return (
    <main className="page">
      <div className="intro-row">
        <Intro
          k="FINAL CONFIRMATION"
          h="Review your task list"
          p="AI detected missing signatures, documents and follow-ups. Edit anything before it goes to the parties."
        />
        <strong>
          {done.length}/{tasks.length}
          <small>confirmed</small>
        </strong>
      </div>
      <div className="tasklayout">
        <div>
          <div className="taskhead">
            <h2>Actions</h2>
            <Btn
              secondary
              onClick={() =>
                setModal({ kind: "task", title: "Add task", task: blank() })
              }
            >
              <Plus />
              Add task
            </Btn>
          </div>
          <section className="tasks">
            {tasks.map((t) => {
              const doc = docs.find((d) => d.id === t.doc);
              return (
                <article className={done.includes(t.id) ? "done" : ""} key={t.id}>
                  <button
                    className="tick"
                    aria-label={`Confirm ${t.title}`}
                    aria-pressed={done.includes(t.id)}
                    onClick={() =>
                      setDone(
                        done.includes(t.id)
                          ? done.filter((x) => x !== t.id)
                          : [...done, t.id],
                      )
                    }
                  >
                    {done.includes(t.id) && <Check />}
                  </button>
                  <div>
                    <h3>{t.title}</h3>
                    <p>
                      {doc ? `${doc.code} · ` : ""}
                      {t.detail}
                    </p>
                    <small>
                      <UserRound />
                      Assigned to {t.assignee || "unassigned"}
                    </small>
                  </div>
                  <em className="when">{dueLabel(t.due)}</em>
                  <button
                    className="edit"
                    aria-label={`Edit ${t.title}`}
                    onClick={() =>
                      setModal({ kind: "task", title: "Edit task", task: t })
                    }
                  >
                    <Pencil />
                  </button>
                </article>
              );
            })}
          </section>
        </div>
        <aside className="email">
          <span className="kicker">AGENT REVIEW EMAIL</span>
          <h2>Transaction audit action list</h2>
          <p>
            To <b>Marlene James</b>
            <br />
            <small>marlene@pinnacleestate.com</small>
          </p>
          <hr />
          <p>Hi Marlene,</p>
          <p>
            The audit for <b>4024 Presidio Dr</b> is ready. Please confirm the
            action list before documents are sent to the parties.
          </p>
          <div className="notice ok">
            <CheckCircle2 />
            <p>
              <b>24 checks completed</b>
              <br />
              {tasks.length} task{tasks.length === 1 ? "" : "s"} need
              {tasks.length === 1 ? "s" : ""} confirmation
            </p>
          </div>
          <small>Demo only — no real email is sent.</small>
          <Btn onClick={() => setSent(true)}>
            {sent ? (
              <>
                <Check />
                Email prepared
              </>
            ) : (
              <>
                <Send />
                Send task list to Agent
              </>
            )}
          </Btn>
        </aside>
      </div>
      <footer className="foot">
        <button className="back" onClick={back}>
          <ArrowLeft />
          Back to timeline
        </button>
        <span>
          <ShieldCheck />
          Audit trail saved · 24 checks ·{" "}
          {docs.filter((d) => d.present && d.selected).length} documents
        </span>
      </footer>
    </main>
  );
}
function Editor({ data, docs, close, save, remove }) {
  const t = data.task;
  const [form, setForm] = useState(
    t || { value: data.value, name: data.value || "", due: "2026-09-18" },
  );
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isTask = data.kind === "task";
  const isNew = isTask && !form.title;
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          save(form);
        }}
      >
        <header>
          <div>
            <span className="kicker">
              {data.kind === "req"
                ? "REQUIREMENT"
                : isTask
                  ? "TASK"
                  : "HUMAN REVIEW"}
            </span>
            <h2>{data.title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={close}>
            <X />
          </button>
        </header>
        {data.warning && (
          <div className="warning">
            <CircleAlert />
            <p>{data.warning}</p>
          </div>
        )}
        {data.kind === "req" ? (
          <>
            <label>
              <span>Requirement name</span>
              <input
                autoFocus
                required
                value={form.name || ""}
                onChange={set("name")}
                placeholder="e.g. HOA Documents"
              />
            </label>
            <label>
              <span>Group</span>
              <select value={form.group || ""} onChange={set("group")}>
                {REQ_GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Why it is needed</span>
              <input
                value={form.desc || ""}
                onChange={set("desc")}
                placeholder="Short reason the audit expects it"
              />
            </label>
          </>
        ) : isTask ? (
          <>
            <label>
              <span>Task name</span>
              <input
                autoFocus
                required
                value={form.title}
                onChange={set("title")}
                placeholder="What needs to happen?"
              />
            </label>
            <div className="two">
              <label>
                <span>Due date</span>
                <input type="date" value={form.due} onChange={set("due")} />
              </label>
              <label>
                <span>Assigned to</span>
                <input
                  value={form.assignee}
                  onChange={set("assignee")}
                  placeholder="Name or role"
                />
              </label>
            </div>
            <label>
              <span>Related document</span>
              <select value={form.doc} onChange={set("doc")}>
                <option value="">None</option>
                {docs
                  .filter((d) => d.present)
                  .map((d) => (
                    <option value={d.id} key={d.id}>
                      {d.code} · {d.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Note</span>
              <textarea
                value={form.detail}
                onChange={set("detail")}
                placeholder="Why this task exists"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              <span>{data.kind ? "Deadline name" : "Confirmed value"}</span>
              <input autoFocus value={form.value || ""} onChange={set("value")} />
            </label>
            {data.kind && (
              <label>
                <span>Due date</span>
                <input type="date" value={form.due} onChange={set("due")} />
              </label>
            )}
          </>
        )}
        <footer>
          {isTask && !isNew && (
            <button type="button" className="danger" onClick={remove}>
              Delete task
            </button>
          )}
          <Btn secondary onClick={close}>
            Cancel
          </Btn>
          <Btn>
            {data.kind === "req"
              ? "Add requirement"
              : isTask
                ? "Save task"
                : data.id
                  ? "Resolve & save"
                  : "Add deadline"}
          </Btn>
        </footer>
      </form>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
