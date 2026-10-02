import { nseMachine } from '@/lib/lab/nse/machine'
import { createTerminalRoutes } from '@/lib/lab/terminal'

const routes = createTerminalRoutes(nseMachine)

export const GET = routes.GET
export const POST = routes.POST
