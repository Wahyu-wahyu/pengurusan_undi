import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface Participant {
  id: string;
  name: string;
  identifier?: string;
  phone?: string;
  attended: boolean;
  receivedStipend: boolean;
  stipendDate?: string | null;
  markedBy?: string | null;
  notes?: string;
}

const STORAGE_KEY = "participant-tracker:v1";

function loadData(): Participant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveData(data: Participant[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function download(filename: string, text: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function csvEscape(s: string) {
  if (s == null) return "";
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCSV(rows: Participant[]): string {
  const headers = [
    "id",
    "name",
    "identifier",
    "phone",
    "attended",
    "receivedStipend",
    "stipendDate",
    "markedBy",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const line = [
      r.id,
      r.name,
      r.identifier ?? "",
      r.phone ?? "",
      r.attended ? "1" : "0",
      r.receivedStipend ? "1" : "0",
      r.stipendDate ?? "",
      r.markedBy ?? "",
      r.notes ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(",");
    lines.push(line);
  }
  return lines.join("\n");
}

function fromCSV(csv: string): Participant[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines.shift()!;
  const cols = header.split(",");
  const idx = (k: string) => cols.indexOf(k);
  const out: Participant[] = [];
  for (const line of lines) {
    const parts: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { parts.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    parts.push(cur);

    const get = (k: string) => parts[idx(k)] ?? "";
    const p: Participant = {
      id: get("id") || uuidv4(),
      name: get("name"),
      identifier: get("identifier") || undefined,
      phone: get("phone") || undefined,
      attended: get("attended") === "1" || get("attended").toLowerCase() === "true",
      receivedStipend:
        get("receivedStipend") === "1" || get("receivedStipend").toLowerCase() === "true",
      stipendDate: get("stipendDate") || null,
      markedBy: get("markedBy") || null,
      notes: get("notes") || undefined,
    };
    if (p.name.trim()) out.push(p);
  }
  return out;
}

export default function App() {
  const [data, setData] = useState<Participant[]>(loadData());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "attended">("all");
  const [newRow, setNewRow] = useState({ name: "", identifier: "", phone: "" });
  const [userName, setUserName] = useState<string>("");

  useEffect(() => { saveData(data); }, [data]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const q = search.toLowerCase().trim();
      const matches = !q ||
        r.name.toLowerCase().includes(q) ||
        (r.identifier || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q);

      const passFilter = filter === "all" ? true :
        filter === "unpaid" ? !r.receivedStipend :
        filter === "paid" ? r.receivedStipend :
        filter === "attended" ? r.attended : true;

      return matches && passFilter;
    });
  }, [data, search, filter]);

  function addParticipant() {
    if (!newRow.name.trim()) return;
    const row: Participant = {
      id: uuidv4(),
      name: newRow.name.trim(),
      identifier: newRow.identifier.trim() || undefined,
      phone: newRow.phone.trim() || undefined,
      attended: false,
      receivedStipend: false,
      stipendDate: null,
      markedBy: null,
      notes: "",
    };
    setData((d) => [row, ...d]);
    setNewRow({ name: "", identifier: "", phone: "" });
  }

  function setField(id: string, field: keyof Participant, value: any) {
    setData((d) => d.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const totalCount = data.length;
  const paidCount = data.filter((r) => r.receivedStipend).length;
  const attendedCount = data.filter((r) => r.attended).length;
  const unpaidCount = totalCount - paidCount;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Participant Tracker (Web)</h1>
        $1
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white border shadow-sm">
            <div className="text-sm text-gray-500">Jumlah Semua</div>
            <div className="text-2xl font-semibold">{totalCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border shadow-sm">
            <div className="text-sm text-gray-500">Hadir</div>
            <div className="text-2xl font-semibold">{attendedCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border shadow-sm">
            <div className="text-sm text-gray-500">Sudah Terima</div>
            <div className="text-2xl font-semibold">{paidCount}</div>
          </div>
          <div className="p-3 rounded-2xl bg-white border shadow-sm">
            <div className="text-sm text-gray-500">Belum Terima</div>
            <div className="text-2xl font-semibold">{unpaidCount}</div>
          </div>
        </section>
        <section className="mb-4 p-4 bg-white rounded-2xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Tambah Peserta</h2>
          <div className="grid sm:grid-cols-4 gap-2">
            <input value={newRow.name} onChange={(e) => setNewRow((r) => ({ ...r, name: e.target.value }))} placeholder="Nama penuh" className="px-3 py-2 border rounded-xl bg-white" />
            <input value={newRow.identifier} onChange={(e) => setNewRow((r) => ({ ...r, identifier: e.target.value }))} placeholder="ID/No. rujukan" className="px-3 py-2 border rounded-xl bg-white" />
            <input value={newRow.phone} onChange={(e) => setNewRow((r) => ({ ...r, phone: e.target.value }))} placeholder="No. telefon" className="px-3 py-2 border rounded-xl bg-white" />
            <button onClick={addParticipant} className="px-3 py-2 rounded-xl border bg-gray-900 text-white">Tambah</button>
          </div>
        </section>
        <section className="p-4 bg-white rounded-2xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Senarai Peserta</h2>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="p-2">Nama</th>
                <th className="p-2">ID</th>
                <th className="p-2">Telefon</th>
                <th className="p-2">Hadir</th>
                <th className="p-2">Elaun</th>
                <th className="p-2">Tarikh</th>
                <th className="p-2">Ditanda Oleh</th>
                <th className="p-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={r.name} onChange={(e) => setField(r.id, "name", e.target.value)} /></td>
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={r.identifier || ""} onChange={(e) => setField(r.id, "identifier", e.target.value)} /></td>
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={r.phone || ""} onChange={(e) => setField(r.id, "phone", e.target.value)} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={r.attended} onChange={(e) => setField(r.id, "attended", e.target.checked)} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={r.receivedStipend} onChange={(e) => setField(r.id, "receivedStipend", e.target.checked)} /></td>
                  <td className="p-2 text-xs whitespace-nowrap">{r.stipendDate ? new Date(r.stipendDate).toLocaleString() : ""}</td>
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={r.markedBy || ""} onChange={(e) => setField(r.id, "markedBy", e.target.value)} /></td>
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={r.notes || ""} onChange={(e) => setField(r.id, "notes", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
