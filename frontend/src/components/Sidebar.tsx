'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // Super Admin
  { label: 'Platform Overview', href: '/super-admin', icon: '🏢', roles: ['SUPER_ADMIN'] },
  { label: 'School Registry', href: '/super-admin/schools', icon: '🏫', roles: ['SUPER_ADMIN'] },

  // Principal / Coordinator
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Teachers', href: '/dashboard/staff', icon: '👨‍🏫', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Subjects', href: '/dashboard/subjects', icon: '📚', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Classrooms', href: '/dashboard/classrooms', icon: '🚪', roles: ['PRINCIPAL'] },
  { label: 'Students', href: '/dashboard/students', icon: '🎓', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Rules Engine', href: '/dashboard/rules', icon: '⚖️', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Import Data', href: '/dashboard/import', icon: '📤', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Schedule', href: '/dashboard/schedule', icon: '📅', roles: ['PRINCIPAL', 'COORDINATOR'] },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️', roles: ['PRINCIPAL'] },

  // Teacher
  { label: 'My Schedule', href: '/teacher', icon: '📅', roles: ['TEACHER'] },
  { label: 'Attendance', href: '/teacher/attendance', icon: '✅', roles: ['TEACHER'] },

  // Student
  { label: 'My Schedule', href: '/student', icon: '📅', roles: ['STUDENT'] },
  { label: 'Course Selection', href: '/student/courses', icon: '📝', roles: ['STUDENT'] },
];

export default function Sidebar() {
  const { role, user, schoolId } = useAuth();
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) => {
    // If we have an "acting_role" override in the context, use it to gate access
    const activeRole = role; 
    
    // Simple direct check: Does the current active role have permission for this item?
    if (item.roles.includes(activeRole)) return true;
    
    // Special Case: Super Admin should see Platform items unless they are specifically in "Management Mode"
    // Management Mode is handled by AuthProvider switching the context role to PRINCIPAL.
    
    return false;
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>📅</div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>ScheduleBuilder</span>
          <span className={styles.logoSubtitle}>v1.0</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Navigation</span>
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {isActive && <div className={styles.activeIndicator} />}
              </Link>
            );
          })}

          {typeof window !== 'undefined' && sessionStorage.getItem('acting_role') && (
            <button
              onClick={() => {
                sessionStorage.removeItem('acting_role');
                sessionStorage.removeItem('acting_school_id');
                window.location.href = '/super-admin/schools';
              }}
              className={styles.navItem}
              style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 'var(--space-md)', color: 'var(--text-error)' }}
            >
              <span className={styles.navIcon}>🔙</span>
              <span className={styles.navLabel}>Exit Management</span>
            </button>
          )}
        </div>
      </nav>

      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
        </div>
        <div className={styles.userDetails}>
          <span className={styles.userName}>
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </span>
          <span className={`badge ${
            role === 'SUPER_ADMIN' ? 'badge-accent' :
            role === 'PRINCIPAL' ? 'badge-primary' :
            role === 'COORDINATOR' ? 'badge-success' :
            role === 'TEACHER' ? 'badge-warning' :
            'badge-primary'
          }`}>
            {role || 'No Role'}
          </span>
        </div>
      </div>
    </aside>
  );
}
