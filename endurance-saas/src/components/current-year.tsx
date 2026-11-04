import { Suspense } from 'react'
import { connection } from 'next/server'

/** Année courante, calculée à chaque requête (hors du shell prérendu). */
export function CurrentYear() {
  return (
    <Suspense>
      <Year />
    </Suspense>
  )
}

async function Year() {
  await connection()
  return <>{new Date().getFullYear()}</>
}
