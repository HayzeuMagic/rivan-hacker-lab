import { pivotMachine } from '@/lib/lab/pivot/machine'
import { createTerminalRoutes } from '@/lib/lab/terminal'

const routes = createTerminalRoutes(pivotMachine)

export const GET = routes.GET
export const POST = routes.POST
