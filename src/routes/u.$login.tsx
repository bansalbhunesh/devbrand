import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/u/$login')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/u/$login"!</div>
}
