import { SPORT_GROUPS, type SportKey } from '@/lib/sports'

/** <option> groupées par famille, à placer dans un <select> (SelectField). */
export function SportOptions({ only }: { only?: readonly SportKey[] }) {
  return SPORT_GROUPS.map((g) => {
    const sports = only ? g.sports.filter((s) => only.includes(s.key)) : g.sports
    if (!sports.length) return null
    return (
      <optgroup key={g.label} label={g.label}>
        {sports.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </optgroup>
    )
  })
}
