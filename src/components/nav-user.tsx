import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { EllipsisVerticalIcon, LogOutIcon, UsersIcon, UserCircleIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useNavigate } from "react-router-dom"

interface NavUserProps {
  onAccountClick?: () => void
}

export function NavUser({ onAccountClick }: NavUserProps) {
  const { user, logout, switchUser } = useAuth()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  if (!user) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-white/5 data-[state=open]:text-white hover:bg-white/5 bg-white/[0.05] transition-colors"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-white/10 text-white font-bold">
                  {user.avatarInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-white">{user.name}</span>
                <span className="truncate text-xs text-[#C4A882] capitalize">
                  {user.role}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4 text-[#C4A882]" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {user.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">
                    {user.role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onAccountClick}>
                <UserCircleIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchUser()}>
                <UsersIcon />
                Switch User
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
