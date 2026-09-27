import * as Flags from 'country-flag-icons/react/3x2';
import { Box } from '@mui/material';
import { getTeamByCountryCode } from '@/data/countries';

type FlagComponentMap = Record<string, React.ComponentType<React.SVGAttributes<SVGElement> & { title?: string }>>;

interface CountryFlagProps {
  /** This app's own country code (e.g. 'ANT'), not an ISO code directly —
   * looked up via countries.ts's iso2 field. */
  code: string | null | undefined;
  /** Width in px; height follows automatically from the flag's fixed 3:2
   * aspect ratio. */
  size?: number;
  sx?: object;
}

// Renders a country's flag as an inline SVG — bundled into the JS at build
// time (via country-flag-icons), so there's no per-flag network request.
// That matters here specifically because the event venue's internet can be
// unreliable; a flag next to every country name/code shouldn't ever be the
// thing that hangs or fails to load.
export default function CountryFlag({ code, size = 20, sx }: CountryFlagProps) {
  const country = code ? getTeamByCountryCode(code) : undefined;
  const iso2 = country?.iso2;
  const Flag = iso2 ? (Flags as unknown as FlagComponentMap)[iso2] : undefined;

  // No flag for this code (e.g. FGC's non-national "Hope" team, or an
  // unrecognized code) -- render nothing rather than a broken placeholder.
  if (!Flag) return null;

  return (
    <Box
      component={Flag}
      title={country?.name}
      sx={{
        width: size,
        height: size * (2 / 3),
        borderRadius: '2px',
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...sx,
      }}
    />
  );
}
