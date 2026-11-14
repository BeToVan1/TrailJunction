import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SignEntry } from "./sign-reading.ts";

const directions: { value: SignEntry["direction"]; name: string }[] = [
  { value: undefined, name: "No clear arrow" },
  { value: "left", name: "Left" },
  { value: "right", name: "Right" },
  { value: "straight", name: "Straight ahead" },
];

export function SignReviewEditor({ entries, confirm, cancel }: {
  entries: readonly SignEntry[];
  confirm: (entries: SignEntry[]) => void;
  cancel: () => void;
}) {
  const [rows, setRows] = useState(() => (entries.length ? entries : [{ label: "" }]).map((entry, id) => ({ ...entry, id })));
  const [nextId, setNextId] = useState(rows.length);

  function update(id: number, entry: Partial<SignEntry>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...entry } : row));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirm(rows.flatMap(({ label, direction }) => label.trim() ? [{ label: label.trim(), direction }] : []));
  }

  return (
    <form className="sign-review-form" onSubmit={submit}>
      <p className="muted">Check each label and arrow against the photo.</p>
      {rows.map(({ id, label, direction }, index) => (
        <div className="sign-review-row" key={id}>
          <label><span>Sign label {index + 1}</span>
            <input value={label} maxLength={100} onChange={(event) => update(id, { label: event.target.value })} />
          </label>
          <label><span>Arrow</span>
            <select aria-label={`Arrow for label ${index + 1}`} value={direction ?? ""}
              onChange={(event) => update(id, { direction: directions.find(({ value }) => value === event.target.value)?.value })}>
              {directions.map(({ value, name }) => <option key={name} value={value ?? ""}>{name}</option>)}
            </select>
          </label>
          <button type="button" className="text-action" aria-label={`Remove label ${index + 1}`}
            onClick={() => setRows((current) => current.filter((row) => row.id !== id))}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" className="text-action" disabled={rows.length >= 8} onClick={() => {
        setRows((current) => [...current, { label: "", id: nextId }]);
        setNextId(nextId + 1);
      }}><Plus aria-hidden="true" /> Add a label</button>
      <div className="sheet-links">
        <button type="submit" className="primary-action">Confirm reading</button>
        <button type="button" className="text-action" onClick={cancel}>Cancel</button>
      </div>
    </form>
  );
}
