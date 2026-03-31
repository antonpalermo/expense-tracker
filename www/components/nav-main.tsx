import { type Icon as TablerIcon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton
} from "./ui/sidebar"
import { Link } from "@tanstack/react-router"

export type NavItem = {
  label: string
  url: string
  icon: TablerIcon
}

export type MainNavProps = {
  items: NavItem[]
}

export default function NavMain({ items }: MainNavProps) {
  const plaformNav = items.map(nav => (
    <SidebarMenuItem key={nav.label}>
      <SidebarMenuButton
        tooltip={nav.label}
        render={
          <Link to={nav.url}>
            <nav.icon />
            <span>{nav.label}</span>
          </Link>
        }
      ></SidebarMenuButton>
    </SidebarMenuItem>
  ))

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent className="space-y-1">
        {plaformNav}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
