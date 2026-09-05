'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { PermissionName } from '@/lib/auth-types';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
  Avatar,
  Button,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Build as RequestsIcon,
  Inventory as SparePartsIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  Add as AddIcon,
  People as UsersIcon,
  Groups as TeamsIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Logout as LogoutIcon,
  Password as PasswordIcon,
  Category as FGCInventoryIcon,
  Schedule as ScheduleIcon,
  Settings as ServoIcon,
  Code as ServoProgrammingIcon,
} from '@mui/icons-material';

const drawerWidth = 280;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

interface NavItemComponentProps {
  item: NavItem;
  level?: number;
  onMobileToggle?: () => void;
}

interface NavItem {
  text: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavItem[];
  requiredPermissions?: PermissionName[]; // Array of required permissions to show this item
  requireAnyPermission?: boolean; // If true, user needs ANY of the permissions; if false (default), needs ALL
}

const navItems: NavItem[] = [
  // Main Navigation
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/',
    // Dashboard available to all authenticated users
  },
  {
    text: 'Hospital Intake',
    icon: <AssignmentIcon />,
    href: '/requests/new',
    requiredPermissions: ['requests.create'],
  },
  {
    text: 'View Hospital Requests',
    icon: <RequestsIcon />,
    href: '/requests',
    requiredPermissions: ['requests.view'],
  },
  {
    text: 'Spare Parts Intake',
    icon: <AddIcon />,
    href: '/spare-parts/new',
    requiredPermissions: ['spare_parts.create'],
  },
  {
    text: 'View Spare Parts',
    icon: <SparePartsIcon />,
    href: '/spare-parts',
    requiredPermissions: ['spare_parts.view'],
  },
  
  // Admin Section
  {
    text: 'Admin',
    icon: <AdminIcon />,
    requiredPermissions: ['admin.dashboard', 'admin.users', 'admin.roles', 'admin.reports'],
    requireAnyPermission: true, // Show if user has any admin permission
    children: [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        href: '/admin',
        requiredPermissions: ['admin.dashboard'],
      },
      {
        text: 'Users',
        icon: <UsersIcon />,
        href: '/admin/users',
        requiredPermissions: ['admin.users'],
      },
      {
        text: 'Roles & Permissions',
        icon: <SecurityIcon />,
        href: '/admin/roles',
        requiredPermissions: ['admin.roles'],
      },
      {
        text: 'Requests',
        icon: <AssignmentIcon />,
        href: '/admin/requests',
        requiredPermissions: ['requests.view', 'admin.dashboard'],
        requireAnyPermission: true,
      },
    ],
  },
];

// Resources section - kept separate to float to bottom
const resourcesNavItems: NavItem[] = [
  {
    text: 'Teams',
    icon: <TeamsIcon />,
    href: '/teams',
    requiredPermissions: ['teams.view'],
  },
  {
    text: 'Match Schedule',
    icon: <ScheduleIcon />,
    href: '/matches',
    requiredPermissions: ['matches.view'],
  },
  {
    text: 'Servo Gear Swap',
    icon: <ServoIcon />,
    href: '/servo-gears',
    requiredPermissions: ['documentation.view'], // Servo guides are documentation
  },
  {
    text: 'Servo Programming',
    icon: <ServoProgrammingIcon />,
    href: '/servo-programming',
    requiredPermissions: ['documentation.view'], // Programming guides are documentation
  },
  {
    text: 'Kit of Parts Inventory',
    icon: <FGCInventoryIcon />,
    href: '/fgc-inventory',
    requiredPermissions: ['inventory.view'],
  },
];

function NavItemComponent({ item, level = 0, onMobileToggle }: NavItemComponentProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const handleToggle = () => {
    setOpen(!open);
  };

  // Check if user has required permissions to see this item
  const hasRequiredPermissions = (): boolean => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true; // No permissions required, show to all authenticated users
    }

    if (item.requireAnyPermission) {
      return hasAnyPermission(item.requiredPermissions);
    } else {
      return hasAllPermissions(item.requiredPermissions);
    }
  };

  // For parent items with children, check if any child is visible
  const hasVisibleChildren = (): boolean => {
    if (!item.children) return false;
    return item.children.some(child => {
      if (!child.requiredPermissions || child.requiredPermissions.length === 0) {
        return true;
      }
      if (child.requireAnyPermission) {
        return hasAnyPermission(child.requiredPermissions);
      } else {
        return hasAllPermissions(child.requiredPermissions);
      }
    });
  };

  // Don't render if user doesn't have permissions
  if (!hasRequiredPermissions()) {
    return null;
  }

  // For parent items, don't render if no children are visible
  if (item.children && !hasVisibleChildren()) {
    return null;
  }

  const isActive = item.href === pathname || (item.children?.some(child => child.href === pathname));

  if (item.children) {
    return (
      <>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={handleToggle}
            sx={{
              minHeight: 48,
              px: 2.5,
              pl: level * 2 + 2.5,
              bgcolor: isActive ? 'action.selected' : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child, index) => (
              <NavItemComponent key={index} item={child} level={level + 1} onMobileToggle={onMobileToggle} />
            ))}
          </List>
        </Collapse>
      </>
    );
  }

  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        component={Link}
        href={item.href!}
        onClick={onMobileToggle}
        sx={{
          minHeight: 48,
          px: 2.5,
          pl: level * 2 + 2.5,
          bgcolor: pathname === item.href ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
}

function SidebarContent({ onMobileToggle }: { onMobileToggle?: () => void }) {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // No need to combine items anymore - navItems already includes admin section
  const allNavItems = navItems;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar />
      
      <Divider />
      
      {session?.user && (
        <>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              src={(session.user as { image?: string }).image || undefined}
              alt={session.user.name || 'User'}
              sx={{ width: 40, height: 40 }}
            >
              {session.user.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {session.user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {session.user.email}
              </Typography>
            </Box>
          </Box>
          <Divider />
        </>
      )}

      <List sx={{ flexGrow: 1, py: 1 }}>
        {allNavItems.map((item, index) => (
          <NavItemComponent key={index} item={item} onMobileToggle={onMobileToggle} />
        ))}
      </List>

      <Divider />
      
      <List sx={{ py: 1 }}>
        {resourcesNavItems.map((item, index) => (
          <NavItemComponent key={`resources-${index}`} item={item} onMobileToggle={onMobileToggle} />
        ))}
      </List>

      <Divider />
      
      {session?.user && (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            component={Link}
            href="/account/change-password"
            startIcon={<PasswordIcon />}
            onClick={onMobileToggle}
            color="inherit"
          >
            Change Password
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            color="inherit"
          >
            Sign Out
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default function Sidebar({ mobileOpen, onMobileToggle }: SidebarProps) {
  return (
    <Box
      component="nav"
      sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
    >
      {/* Mobile and tablet drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        <SidebarContent onMobileToggle={onMobileToggle} />
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );
}

export { drawerWidth };