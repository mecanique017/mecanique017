import type { Metadata } from 'next'
import Link from 'next/link'
import { FitImport } from './fit-import'

export const metadata: Metadata = { title: 'Importer des séances — Endurance SaaS' }

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer des séances</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Déposez des fichiers .fit ou une archive complète : export Garmin Connect, ou « Télécharger mes données » de
          Strava (Paramètres → Mon compte). Les archives sont décompressées dans votre navigateur. Le TSS est calculé avec la puissance normalisée
          (vélo) ou la fréquence cardiaque, selon votre{' '}
          <Link href="/dashboard/profile" className="underline underline-offset-4">
            profil
          </Link>
          . Le fichier n’est pas conservé : seuls le résumé et la courbe de la séance sont enregistrés.
        </p>
      </div>
      <FitImport />
    </div>
  )
}
