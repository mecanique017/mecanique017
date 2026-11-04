import { cn } from '@/lib/utils'

const controlClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive'

type BaseProps = { label: string; error?: string; hint?: string; className?: string }

/** Champ de formulaire générique (label + input + erreur), réutilisable dans tous les formulaires. */
export function Field({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: BaseProps & React.ComponentProps<'input'> & { id: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={controlClass}
        {...props}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  )
}

export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: BaseProps & React.ComponentProps<'select'> & { id: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        className={controlClass}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  )
}

export function TextareaField({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: BaseProps & React.ComponentProps<'textarea'> & { id: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, 'h-auto min-h-24')}
        {...props}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  )
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-xs text-destructive">
        {error}
      </p>
    )
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    )
  }
  return null
}
