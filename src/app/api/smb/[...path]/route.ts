import { smbMachine } from '@/lib/lab/smb/machine'
import { createTerminalRoutes } from '@/lib/lab/terminal'

const routes = createTerminalRoutes(smbMachine)

export const GET = routes.GET
export const POST = routes.POST
