"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
} from '@mui/icons-material';

interface MetricData {
  value: number;
  label: string;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    timeframe: string;
  };
}

interface AnalyticsWidgetProps {
  title: string;
  icon: React.ReactElement;
  primaryMetric: MetricData;
  secondaryMetrics?: MetricData[];
  color?: 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success';
}

export function AnalyticsWidget({
  title,
  icon,
  primaryMetric,
  secondaryMetrics = [],
  color = 'primary'
}: AnalyticsWidgetProps) {
  const getTrendIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      default:
        return <TrendingFlat fontSize="small" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={React.cloneElement(icon, { color: color } as Record<string, unknown>)}
        title={
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        }
        action={
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {primaryMetric.value.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {primaryMetric.label}
            </Typography>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {primaryMetric.change && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={getTrendIcon(primaryMetric.change.direction)}
              label={`${primaryMetric.change.value > 0 ? '+' : ''}${primaryMetric.change.value} ${primaryMetric.change.timeframe}`}
              size="small"
              color={getTrendColor(primaryMetric.change.direction) as 'success' | 'error' | 'default'}
              variant="outlined"
            />
          </Box>
        )}
        
        {secondaryMetrics.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {secondaryMetrics.map((metric, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {metric.value.toLocaleString()}
                    </Typography>
                    {metric.change && (
                      <Chip
                        icon={getTrendIcon(metric.change.direction)}
                        label={`${metric.change.value > 0 ? '+' : ''}${metric.change.value}`}
                        size="small"
                        color={getTrendColor(metric.change.direction) as 'success' | 'error' | 'default'}
                        variant="outlined"
                        sx={{ minWidth: 'auto', '& .MuiChip-label': { px: 1 } }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}