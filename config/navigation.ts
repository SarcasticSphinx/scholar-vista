import {
  LayoutDashboard,
  Users,
  UsersRound,
  Building2,
  Handshake,
  Calendar,
  MessageSquare,
  ArrowLeftRight,
  AlertCircle,
  DollarSign,
  FileText,
  Megaphone,
  BarChart3,
  CheckSquare,
  Zap,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { NavItem, SidebarUser } from "@/components/dashboard-sidebar";

// Admin navigation items
export const adminNavItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/admin" },
  { title: "Leads & Contacts", icon: Users, url: "/admin/leads" },
  { title: "My Team", icon: UsersRound, url: "/admin/team" },
  { title: "Properties & MLS", icon: Building2, url: "/admin/properties" },
  { title: "Deals & Pipeline", icon: Handshake, url: "/admin/deals" },
  { title: "Tasks", icon: CheckSquare, url: "/admin/tasks" },
  { title: "Viewing Schedules", icon: Calendar, url: "/admin/schedules" },
  { title: "Messages", icon: MessageSquare, url: "/admin/messages" },
  { title: "Transaction", icon: ArrowLeftRight, url: "/admin/transaction" },
  { title: "Issue Management", icon: AlertCircle, url: "/admin/issues" },
  { title: "Commission Settings", icon: DollarSign, url: "/admin/commission" },
  { title: "Template Library", icon: FileText, url: "/admin/templates" },
  { title: "Announcements", icon: Megaphone, url: "/admin/announcements" },
];

// Operator navigation items
export const operatorNavItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/operator" },
  { title: "Leads", icon: Users, url: "/operator/leads" },
  { title: "Properties", icon: Building2, url: "/operator/properties" },
  { title: "Pipeline", icon: BarChart3, url: "/operator/pipeline" },
  { title: "Tasks", icon: CheckSquare, url: "/operator/tasks" },
  { title: "Viewing Schedules", icon: Calendar, url: "/operator/schedules" },
  { title: "Messages", icon: MessageSquare, url: "/operator/messages" },
  { title: "Automation", icon: Zap, url: "/operator/automation" },
  { title: "Performance Insights", icon: TrendingUp, url: "/operator/insights" },
  { title: "Profile", icon: UserCircle, url: "/operator/profile" },
];

// Default users (will be replaced with real auth data)
export const adminUser: SidebarUser = {
  name: "Admin User",
  role: "Administrator",
  initials: "AU",
};

export const operatorUser: SidebarUser = {
  name: "Operator User",
  role: "Verified Operator",
  initials: "OU",
};
