import type { LucideIcon } from 'lucide-react'

type FormFieldProps = React.ComponentProps<'input'> & {
  id: string
  label: string
  icon: LucideIcon
}

/** Champ de formulaire avec label et icône (utilisé par login / register). */
export function FormField({ id, label, icon: Icon, ...inputProps }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          id={id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...inputProps}
        />
      </div>
    </div>
  )
}
