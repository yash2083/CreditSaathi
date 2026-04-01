import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../store/authSlice";
import { useState } from "react";
import {
  LayoutDashboard, Building2, PlusCircle, Upload, Landmark,
  ChevronLeft, ChevronRight, Bell, LogOut, User,
} from "lucide-react";
import ChatbotWidget from "./ChatbotWidget";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/msmes", label: "MSME Portfolio", icon: Building2, roles: ["admin", "bank_officer"] },
  { path: "/msme/onboard", label: "Onboard MSME", icon: PlusCircle },
  { path: "/data-upload", label: "Data Upload", icon: Upload },
  { path: "/loans", label: "Loan Center", icon: Landmark },
];

export default function AppLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  const filtered = navItems.filter((i) => !i.roles || i.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            CS
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-txt">CreditSaathi</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {filtered.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? "sidebar-link-active" : "sidebar-link"}
            >
              <item.icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-txt truncate">{user?.name}</p>
                <p className="text-[10px] text-txt-muted capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-txt-secondary hover:text-danger rounded transition-colors">
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="h-9 border-t border-border flex items-center justify-center text-txt-muted hover:text-txt hover:bg-surface-alt transition-all">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-xs text-txt-secondary">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-txt-muted hover:bg-surface-alt transition-colors">
              <Bell size={16} />
            </button>
          </div>
        </header>
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
        <ChatbotWidget />
      </main>
    </div>
  );
}
