'use client';

import { ReactNode } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Groups as GroupsIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminProtection from '@/components/admin/AdminProtection';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const adminMenuItems = [
  { label: 'Dashboard', icon: DashboardIcon, href: '/admin' },
  { label: 'Users', icon: PeopleIcon, href: '/admin/users' },
  { label: 'Teams', icon: GroupsIcon, href: '/admin/teams' },
  { label: 'Roles & Permissions', icon: SecurityIcon, href: '/admin/roles' },
  { label: 'Requests', icon: AssignmentIcon, href: '/admin/requests' },
  { label: 'Spare Parts', icon: BuildIcon, href: '/admin/spare-parts' },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();

  const getBreadcrumbTitle = () => {
    const item = adminMenuItems.find(item => item.href === pathname);
    return item ? item.label : title;
  };

  return (
    <AdminProtection>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </MuiLink>
          <MuiLink component={Link} href="/admin" color="inherit">
            Admin
          </MuiLink>
          <Typography color="text.primary">{getBreadcrumbTitle()}</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Sidebar Navigation */}
          <Card sx={{ width: 280, height: 'fit-content', position: 'sticky', top: 24 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Admin Navigation
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={isActive}
                        sx={{
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.50',
                            '&:hover': {
                              backgroundColor: 'primary.100',
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Icon color={isActive ? 'primary' : 'inherit'} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: {
                              color: isActive ? 'primary' : 'inherit',
                              sx: {
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.875rem',
                              },
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Box sx={{ flex: 1 }}>
            {children}
          </Box>
        </Box>
      </Container>
    </AdminProtection>
  );
}