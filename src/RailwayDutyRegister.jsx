import React, { useState, useEffect, useMemo } from "react";

export default function RailwayDutyRegister() {
  const empty = {
    date: "",
    trainNo: "",
    from: "",
    to: "",
    signOn: "",
    signOff: "",
    km: "",
    pr: "",
    remarks: "",
  };

  const [entry, setEntry] = useState(empty);
  const [entries, setEntries] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const saved = localStorage.getItem("kr_duty_register_v1");
    if (saved) setEntries(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem("kr_duty_register_v1", JSON.stringify(entries));
  }, [entries]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntry((s) => ({ ...s, [name]: value }));
  };

  const parseDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0);
  };

  const durationHours = (s, e) => (!s || !e ? 0 : (e - s) / (1000 * 60 * 60));

  const calcNightHours = (s, e) => {
    if (!s || !e) return 0;
    if (e <= s) e = new Date(e.getTime() + 86400000);
    const nightStart = 22, nightEnd = 6;
    let total = 0, temp = new Date(s);
    while (temp < e) {
      const startNight = new Date(temp);
      startNight.setHours(nightStart, 0, 0, 0);
      const endNight = new Date(startNight);
      endNight.setDate(endNight.getDate() + 1);
      endNight.setHours(nightEnd, 0, 0, 0);
      const overlapStart = s > startNight ? s : startNight;
      const overlapEnd = e < endNight ? e : endNight;
      if (overlapEnd > overlapStart)
        total += (overlapEnd - overlapStart) / 3600000;
      temp.setDate(temp.getDate() + 1);
    }
    return total.toFixed(2);
  };

  const addEntry = (ev) => {
    ev.preventDefault();
    if (!entry.date) return alert("Please select date");
    const s = parseDateTime(entry.date, entry.signOn);
    const o = parseDateTime(entry.date, entry.signOff);
    let effOff = o && s && o <= s ? new Date(o.getTime() + 86400000) : o;
    const duty = s && effOff ? durationHours(s, effOff).toFixed(2) : 0;
    const night = s && effOff ? calcNightHours(s, effOff) : 0;
    const newEntry = { id: Date.now(), ...entry, km: +entry.km || 0, dutyHours: +duty, nightHours: +night };
    setEntries((arr) => [newEntry, ...arr].sort((a, b) => a.date.localeCompare(b.date)));
    setEntry(empty);
  };

  const deleteEntry = (id) => setEntries((arr) => arr.filter((r) => r.id !== id));

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date && e.date.startsWith(month)),
    [entries, month]
  );

  const enrichedEntries = useMemo(() => {
    let progKm = 0, progDuty = 0;
    return monthEntries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => {
        progKm += +r.km || 0;
        progDuty += +r.dutyHours || 0;
        return { ...r, progressiveKm: progKm, progressiveDuty: +progDuty.toFixed(2) };
      });
  }, [monthEntries]);

  const totals = useMemo(() => {
    const tKm = enrichedEntries.reduce((s, r) => s + (+r.km || 0), 0);
    const tDuty = enrichedEntries.reduce((s, r) => s + (+r.dutyHours || 0), 0);
    const tNight = enrichedEntries.reduce((s, r) => s + (+r.nightHours || 0), 0);
    return { tKm, tDuty: tDuty.toFixed(2), tNight: tNight.toFixed(2) };
  }, [enrichedEntries]);

  const exportCSV = () => {
    const header = ["Date","Train No","From","To","Sign On","Sign Off","Duty Hours","Night Hours","PR","KM","Prog KM","Prog Duty","Remarks"];
    const rows = enrichedEntries.map((r) =>
      [r.date, r.trainNo, r.from, r.to, r.signOn, r.signOff, r.dutyHours, r.nightHours, r.pr, r.km, r.progressiveKm, r.progressiveDuty, r.remarks]
    );
    const csv = [header, ...rows].map((r) => r.join(",")).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `duty_${month}.csv`;
    a.click();
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: "bold" }}>Konkan Railway Duty Register</h1>

      <form onSubmit={addEntry} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "16px 0" }}>
        <input type="date" name="date" value={entry.date} onChange={handleChange} />
        <input name="trainNo" value={entry.trainNo} onChange={handleChange} placeholder="Train No" />
        <input name="from" value={entry.from} onChange={handleChange} placeholder="From" />
        <input name="to" value={entry.to} onChange={handleChange} placeholder="To" />
        <input type="time" name="signOn" value={entry.signOn} onChange={handleChange} />
        <input type="time" name="signOff" value={entry.signOff} onChange={handleChange} />
        <input type="number" name="km" value={entry.km} onChange={handleChange} placeholder="Km" />
        <select name="pr" value={entry.pr} onChange={handleChange}>
          <option value="">--</option>
          <option value="PR">PR</option>
          <option value="CNF">CNF</option>
          <option value="WAIT">WAIT</option>
          <option value="LEAVE">LEAVE</option>
        </select>
        <input style={{ gridColumn: "1/5" }} name="remarks" value={entry.remarks} onChange={handleChange} placeholder="Remarks" />
        <button>Add</button>
        <button type="button" onClick={() => setEntry(empty)}>Clear</button>
        <button type="button" onClick={exportCSV}>Export CSV</button>
        <button type="button" onClick={() => window.print()}>Print</button>
      </form>

      <div>
        <p><b>Total Km:</b> {totals.tKm} | <b>Duty Hrs:</b> {totals.tDuty} | <b>Night Hrs:</b> {totals.tNight}</p>
      </div>

      <table border="1" width="100%" style={{ marginTop: 16, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Date</th><th>Train</th><th>From</th><th>To</th><th>On</th><th>Off</th>
            <th>Duty</th><th>Night</th><th>PR</th><th>KM</th><th>Prog KM</th><th>Prog Duty</th><th>Remarks</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {enrichedEntries.length === 0 && <tr><td colSpan={14}>No entries</td></tr>}
          {enrichedEntries.map((r) => (
            <tr key={r.id}>
              <td>{r.date}</td><td>{r.trainNo}</td><td>{r.from}</td><td>{r.to}</td>
              <td>{r.signOn}</td><td>{r.signOff}</td><td>{r.dutyHours}</td>
              <td>{r.nightHours}</td><td>{r.pr}</td><td>{r.km}</td>
              <td>{r.progressiveKm}</td><td>{r.progressiveDuty}</td><td>{r.remarks}</td>
              <td><button onClick={() => deleteEntry(r.id)}>Del</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
