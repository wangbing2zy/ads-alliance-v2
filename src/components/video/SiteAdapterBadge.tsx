import React from 'react';
import { Chip } from '@mui/material';

interface SiteAdapterBadgeProps {
  site: string | null;
}

const SITE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  'upbolt.to': 'info',
  'youtube.com': 'error',
  'vimeo.com': 'primary',
};

/**
 * SiteAdapterBadge - Shows a colored chip indicating which video site adapter is used.
 */
export default function SiteAdapterBadge({ site }: SiteAdapterBadgeProps) {
  if (!site) {
    return <Chip label="未知" size="small" variant="outlined" color="default" />;
  }

  const color = SITE_COLORS[site] || 'default';

  return (
    <Chip
      label={site}
      size="small"
      variant="outlined"
      color={color}
      sx={{ fontSize: 12 }}
    />
  );
}
