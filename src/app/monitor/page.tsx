'use client';

import { useEffect, useState } from 'react';
import { IRequest } from '@/lib/types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import {
  AccessTime,
  CheckCircle,
  HourglassEmpty,
  Person,
} from '@mui/icons-material';

// Enriched request type with country_name
type EnrichedRequest = IRequest & { country_name?: string };

interface QueueData {
  summary: {
    totalOpen: number;
    totalInProgress: number;
  };
  requests: {
    hardware: { open: EnrichedRequest[]; inProgress: EnrichedRequest[] };
    software: { open: EnrichedRequest[]; inProgress: EnrichedRequest[] };
    machine_shop: { open: EnrichedRequest[]; inProgress: EnrichedRequest[] };
    battery_charging: { open: EnrichedRequest[]; inProgress: EnrichedRequest[] };
  };
}

const TYPE_LABELS: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  machine_shop: 'Machine Shop',
  battery_charging: 'Battery Charging',
};

const TYPE_COLORS: Record<string, { primary: string; secondary: string }> = {
  hardware: { primary: '#1976d2', secondary: '#42a5f5' },
  software: { primary: '#9c27b0', secondary: '#ba68c8' },
  machine_shop: { primary: '#f57c00', secondary: '#ff9800' },
  battery_charging: { primary: '#388e3c', secondary: '#66bb6a' },
};

export default function QueueDisplayPage() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        const response = await fetch('/api/queue-display');
        if (!response.ok) {
          throw new Error('Failed to fetch queue data');
        }
        const data = await response.json();
        setQueueData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchQueueData();
    const interval = setInterval(fetchQueueData, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ${diffMins % 60}m ago`;
    } else {
      return `${diffDays}d ${diffHours % 24}h ago`;
    }
  };

  const formatName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return parts[0]; // Just return the name if it's only one word
    }
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstName} ${lastInitial}.`;
  };

  const getAgeBorderColor = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins > 90) {
      return '#f44336'; // Red for over 90 minutes
    } else if (diffMins > 30) {
      return '#ffc107'; // Yellow for over 30 minutes
    }
    return '#4caf50'; // Green for under 30 minutes
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        }}
      >
        <Typography variant="h3" sx={{ color: 'white' }}>
          Loading Queue Data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        }}
      >
        <Paper sx={{ p: 4, bgcolor: 'error.dark' }}>
          <Typography variant="h4" sx={{ color: 'white' }}>
            Error: {error}
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!queueData) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        p: 3,
      }}
    >
        {/* Header */}
        {/* <Paper
          elevation={8}
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                Request Queue Monitor
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
                Real-time Status Dashboard
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  fontFamily: 'monospace',
                }}
              >
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Box>
          </Stack>
        </Paper> */}

        {/* Summary Stats */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Card
              elevation={8}
              sx={{
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                height: '100%',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <HourglassEmpty sx={{ fontSize: 40, color: 'white' }} />
                  <Box>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                      {queueData.summary.totalOpen}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', mt: 0.5 }}>
                      Unassigned Requests
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Card
              elevation={8}
              sx={{
                background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
                height: '100%',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                  <Box>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
                      {queueData.summary.totalInProgress}
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white', mt: 0.5 }}>
                      In Progress
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>

        {/* Request Types Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {Object.entries(queueData.requests).map(([type, typeData]) => {
            const totalForType = typeData.open.length + typeData.inProgress.length;

            if (totalForType === 0) {
              return null;
            }

            const colors = TYPE_COLORS[type];

            return (
              <Card
                key={type}
                elevation={8}
                sx={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 'bold',
                        color: 'white',
                        textTransform: 'uppercase',
                      }}
                    >
                      {TYPE_LABELS[type]}
                    </Typography>
                    <Chip
                      label={totalForType}
                      sx={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        bgcolor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        height: 50,
                        minWidth: 50,
                        borderRadius: '25px',
                        px: 2,
                      }}
                    />
                  </Stack>

                  {/* In Progress Requests */}
                  {typeData.inProgress.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, pb: 1, borderBottom: '2px solid rgba(255,183,77,0.3)' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: '#ffb74d',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                          In Progress ({typeData.inProgress.length})
                        </Typography>
                      </Stack>
                      <Stack spacing={2}>
                        {typeData.inProgress.map((request) => (
                          <Card
                            key={request.id}
                            elevation={8}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              backdropFilter: 'blur(10px)',
                              borderLeft: `6px solid ${getAgeBorderColor(request.created_at.toString())}`,
                            }}
                          >
                            <CardContent sx={{ py: 2 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    flex: 1,
                                  }}
                                >
                                  {request.country_name || request.country_code}
                                </Typography>
                                {request.assigned_to_name && (
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Person sx={{ fontSize: 20, color: 'white' }} />
                                    <Typography
                                      variant="body1"
                                      sx={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {formatName(request.assigned_to_name)}
                                    </Typography>
                                  </Stack>
                                )}
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <AccessTime sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {formatDate(request.created_at.toString())}
                                  </Typography>
                                </Stack>
                              </Stack>
                              {request.comments && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'rgba(255,255,255,0.9)',
                                    mt: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {request.comments}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Open Requests */}
                  {typeData.open.length > 0 && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, pb: 1, borderBottom: '2px solid rgba(100,181,246,0.3)' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: '#64b5f6',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                          Unassigned ({typeData.open.length})
                        </Typography>
                      </Stack>
                      <Stack spacing={2}>
                        {typeData.open.map((request) => (
                          <Card
                            key={request.id}
                            elevation={8}
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.25)',
                              backdropFilter: 'blur(10px)',
                              borderLeft: `6px solid ${getAgeBorderColor(request.created_at.toString())}`,
                            }}
                          >
                            <CardContent sx={{ py: 2 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Typography
                                  variant="h6"
                                  sx={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    flex: 1,
                                  }}
                                >
                                  {request.country_name || request.country_code}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <AccessTime sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {formatDate(request.created_at.toString())}
                                  </Typography>
                                </Stack>
                              </Stack>
                              {request.comments && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'rgba(255,255,255,0.9)',
                                    mt: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {request.comments}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Footer */}
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            px: 3,
            py: 1.5,
            bgcolor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#4caf50',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="body1" sx={{ color: 'white' }}>
              Auto-refresh: 30s
            </Typography>
          </Stack>
        </Paper>
    </Box>
  );
}