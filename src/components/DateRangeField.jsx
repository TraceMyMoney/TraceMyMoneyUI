import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import DatePicker from "react-datepicker";
import { PRESETS, presetRange, detectPreset } from "../utils/dateRangePresets.js";

/**
 * Preset dropdown (This week / This month / This year / All time / Custom)
 * beside the calendar range picker. `value` is [start, end] or null (all time);
 * `onChange` gets a full range or null. Choosing a preset converts it to dates
 * right away. Picking dates by hand shows "Custom"; clearing shows "All time".
 */
export default function DateRangeField({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false); // "Custom" picked, no dates yet
  const [pending, setPending] = useState(null); // first click of a range
  const ref = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const detected = detectPreset(value);
  const shown = custom && !value ? "custom" : detected;
  const label =
    shown === "custom"
      ? "Custom"
      : PRESETS.find((p) => p.key === shown)?.label || "All time";

  const pick = (key) => {
    setOpen(false);
    setPending(null);
    setCustom(false);
    onChange(presetRange(key));
  };
  const pickCustom = () => {
    setOpen(false);
    setCustom(true);
    setTimeout(() => pickerRef.current?.setOpen?.(true), 0);
  };

  const onRange = ([s, e]) => {
    if (s && e) {
      setPending(null);
      setCustom(false);
      onChange([s, e]);
    } else if (!s && !e) {
      setPending(null);
      setCustom(false);
      onChange(null);
    } else {
      // first click: keep the picker open, apply when the range is complete
      setPending([s, e]);
    }
  };

  const range = pending || value || [null, null];

  return (
    <div className={`drf ${className}`}>
      <div className="drf-select" ref={ref}>
        <button
          type="button"
          className={`drf-btn${open ? " open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Date range preset: ${label}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{label}</span>
          <ChevronDown size={14} />
        </button>
        {open && (
          <ul className="drf-menu" role="listbox">
            {PRESETS.map((p) => (
              <li key={p.key} role="option" aria-selected={p.key === shown}>
                <button
                  type="button"
                  className={p.key === shown ? "sel" : ""}
                  onClick={() => pick(p.key)}
                >
                  <span>{p.label}</span>
                  {p.key === shown && <Check size={14} />}
                </button>
              </li>
            ))}
            <li className="drf-sep" role="separator" />
            <li role="option" aria-selected={shown === "custom"}>
              <button
                type="button"
                className={shown === "custom" ? "sel" : ""}
                onClick={pickCustom}
              >
                <span>Custom…</span>
                {shown === "custom" && <Check size={14} />}
              </button>
            </li>
          </ul>
        )}
      </div>
      <DatePicker
        ref={pickerRef}
        selectsRange
        startDate={range[0]}
        endDate={range[1]}
        onChange={onRange}
        maxDate={new Date()}
        placeholderText="All time"
        dateFormat="dd/MM/yyyy"
        isClearable
        className="search-input drf-date"
        wrapperClassName="drf-date-wrap"
      />
    </div>
  );
}
