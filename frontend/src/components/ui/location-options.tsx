import { STATES, STATES_LIST, UNION_TERRITORIES } from "@/lib/constants";

/** <option>s for every State and Union Territory of India, grouped and A–Z. */
export function StateOptions() {
  return (
    <>
      <option value="">-- Select State / UT --</option>
      <optgroup label="States">
        {STATES_LIST.map((s) => <option key={s}>{s}</option>)}
      </optgroup>
      <optgroup label="Union Territories">
        {UNION_TERRITORIES.map((s) => <option key={s}>{s}</option>)}
      </optgroup>
    </>
  );
}

/** <option>s for the districts of the selected state (A–Z). */
export function DistrictOptions({ state }: { state: string }) {
  const list = STATES[state] ?? [];
  return (
    <>
      <option value="">{state ? `-- Select District (${list.length}) --` : "-- Select state first --"}</option>
      {list.map((d) => <option key={d}>{d}</option>)}
    </>
  );
}
