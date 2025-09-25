'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import {
  Menu as MenuIcon,
} from '@mui/icons-material';
import Image from 'next/image';

interface AppBarProps {
  onMobileMenuToggle: () => void;
}

export default function TopAppBar({ onMobileMenuToggle }: AppBarProps) {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMobileMenuToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Centered content container */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2
          }}
        >
          {/* App Title */}
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
            (Unofficial)
          </Typography>
          {/* FIRST Global Logo */}
          <Image
            src="/images/logo.png"
            alt="FIRST Global"
            width={120}
            height={40}
            style={{ objectFit: 'contain' }}
          />
          
          {/* App Title */}
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
            Robot Hospital Information System
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}