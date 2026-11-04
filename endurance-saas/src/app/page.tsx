import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, Zap } from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Métriques Avancées",
    text: "Suivi ATL, CTL, TSB et zones d'effort en temps réel.",
  },
  {
    icon: Calendar,
    title: "Planification",
    text: "Calendrier dynamique et gestion intelligente des charges.",
  },
  {
    icon: Zap,
    title: "Coach IA",
    text: "Débriefings automatisés et adaptations personnalisées.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Phase 1 Initialisée avec succès &mdash;&nbsp;
          <code className="font-bold">Phase 4 : saisie, graphiques et offres</code>
        </p>
      </div>

      <div className="my-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Endurance Performance SaaS
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Votre écosystème de suivi d&apos;entraînement, d&apos;analyse physiologique et de coaching par IA.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/register">Commencer</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pricing">Voir les offres</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="p-6 border rounded-xl bg-card shadow-sm">
            <Icon className="w-8 h-8 mb-3 text-primary" />
            <h2 className="font-semibold text-lg mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
