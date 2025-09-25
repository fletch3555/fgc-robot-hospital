'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePermissions } from '@/contexts/PermissionsContext';
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
  List as ListIcon,
  People as UsersIcon,
  Groups as TeamsIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Logout as LogoutIcon,
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

interface NavItem {
  text: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavItem[];
  requiredPermissions?: string[]; // Array of required permissions to show this item
  requireAnyPermission?: boolean; // If true, user needs ANY of the permissions; if false (default), needs ALL
}

const navItems: NavItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/',
    // Dashboard available to all authenticated users
  },
  {
    text: 'Intake Form',
    icon: <AssignmentIcon />,
    href: '/requests/new',
    requiredPermissions: ['requests.create'],
  },
  {
    text: 'Support Requests',
    icon: <RequestsIcon />,
    href: '/requests',
    requiredPermissions: ['requests.view'],
  },
  {
    text: 'Spare Parts',
    icon: <SparePartsIcon />,
    requiredPermissions: ['spare_parts.view', 'spare_parts.create'],
    requireAnyPermission: true, // Show if user can view OR create spare parts
    children: [
      { 
        text: 'View All', 
        icon: <ListIcon />, 
        href: '/spare-parts',
        requiredPermissions: ['spare_parts.view'],
      },
      { 
        text: 'New Request', 
        icon: <AddIcon />, 
        href: '/spare-parts/new',
        requiredPermissions: ['spare_parts.create'],
      },
    ],
  },
];

const getAdminNavItems = (): NavItem[] => [
  {
    text: 'Admin',
    icon: <AdminIcon />,
    requiredPermissions: ['admin.dashboard', 'users.view', 'admin.roles', 'admin.reports'],
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
        requiredPermissions: ['users.view'],
      },
      { 
        text: 'Teams', 
        icon: <TeamsIcon />, 
        href: '/admin/teams',
        requiredPermissions: ['admin.dashboard'], // Teams management part of admin dashboard
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
      { 
        text: 'Spare Parts', 
        icon: <BuildIcon />, 
        href: '/admin/spare-parts',
        requiredPermissions: ['spare_parts.view', 'admin.dashboard'],
        requireAnyPermission: true,
      },
    ],
  },
];

const getResourcesNavItems = (): NavItem[] => [
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

function NavItemComponent({ item, level = 0 }: { item: NavItem; level?: number }) {
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
              <NavItemComponent key={index} item={child} level={level + 1} />
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

function SidebarContent() {
  const { data: session } = useSession();
  const { hasAnyPermission } = usePermissions();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Combine nav items with admin items if user has any admin permissions
  const allNavItems = React.useMemo(() => {
    const items = [...navItems];
    
    // Check if user has any admin permissions before adding admin nav items
    const adminPermissions = ['admin.dashboard', 'users.view', 'admin.roles', 'admin.reports'];
    if (hasAnyPermission(adminPermissions)) {
      items.push(...getAdminNavItems());
    }
    
    return items;
  }, [hasAnyPermission]);

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
          <NavItemComponent key={index} item={item} />
        ))}
      </List>

      <Divider />
      
      <List sx={{ py: 1 }}>
        {getResourcesNavItems().map((item, index) => (
          <NavItemComponent key={`resources-${index}`} item={item} />
        ))}
      </List>

      <Divider />
      
      {session?.user && (
        <Box sx={{ p: 2 }}>
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
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        <SidebarContent />
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
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