import type { LucideIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "./ui/sidebar"

export default function NavMain({
  routes
}: {
  routes: { label: string; path: string; icon?: LucideIcon }[]
}) {
  const navMenus = routes.map(route => (
    <SidebarMenuItem key={route.label}>
      <SidebarMenuButton asChild>
        <Link to={route.path}>
          {route.icon && <route.icon />}
          {route.label}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ))

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Main</SidebarGroupLabel>
      <SidebarContent>
        <SidebarMenu>{navMenus}</SidebarMenu>
      </SidebarContent>
    </SidebarGroup>
  )
}
