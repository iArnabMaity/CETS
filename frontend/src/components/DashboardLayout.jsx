import React, { useState, useEffect } from 'react';
import { Bell, User, Briefcase, GraduationCap, ClipboardList, ShieldAlert, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardLayout({ children, employeeId }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch notifications on load
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/notifications/${employeeId}`);
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to fetch notifications");
      }
    };
    fetchNotifications();
  }, [employeeId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n._id);
    if (unreadIds.length === 0) return;

    try {
      await fetch(`http://localhost:8000/api/notifications/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unreadIds)
      });
      // Instantly update UI to remove the glow
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark as read");
    }
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'employment', label: 'Employment Details', icon: Briefcase },
    { id: 'education', label: 'Education Details', icon: GraduationCap },
    { id: 'noticeboard', label: 'Noticeboard & Hiring', icon: ClipboardList },
    { id: 'security', label: 'Change Password', icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            CETS Portal
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === item.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button className="flex items-center space-x-3 text-red-500 hover:text-red-600 px-4 py-2 w-full transition-colors">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP NAVIGATION */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {menuItems.find(m => m.id === activeTab)?.label}
          </h1>
          
          <div className="relative">
            {/* THE GLOWING BELL */}
            <button 
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                if (!isDropdownOpen) markAsRead();
              }}
              className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="text-slate-600 dark:text-slate-300" size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}
            {isDropdownOpen && (
              <Card className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-50 shadow-xl border-slate-200 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-semibold">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No new notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className={`p-4 border-b border-slate-50 dark:border-slate-800/50 ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{notif.title}</span>
                        <Badge variant="outline" className="text-[10px]">{notif.type}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{notif.message}</p>
                    </div>
                  ))
                )}
              </Card>
            )}
          </div>
        </header>

        {/* DYNAMIC VIEW INJECTION */}
        <div className="flex-1 overflow-auto p-8">
          {children(activeTab)}
        </div>
      </main>
    </div>
  );
}