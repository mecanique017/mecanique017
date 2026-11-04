/** Bandeau d'erreur des formulaires d'auth. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="p-3 text-sm rounded-md bg-destructive/15 text-destructive border border-destructive/30"
    >
      {message}
    </div>
  )
}
