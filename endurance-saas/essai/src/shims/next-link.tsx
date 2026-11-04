import { Link as RouterLink } from 'react-router-dom'

/** Remplace next/link : mêmes chemins (/dashboard/…), navigation par le routeur (HashRouter). */
export default function Link({ href, ...props }: { href: string } & Omit<React.ComponentProps<'a'>, 'href'>) {
  return <RouterLink to={href} {...props} />
}
