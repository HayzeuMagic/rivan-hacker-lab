import { privescMachine } from '@/lib/lab/privesc/machine'
import { createTerminalRoutes } from '@/lib/lab/terminal'

const routes = createTerminalRoutes(privescMachine)

export const GET = routes.GET
export const POST = routes.POST
