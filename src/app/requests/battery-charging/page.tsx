"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { BatteryChargingFullRounded } from "@mui/icons-material";
import { WithAuth } from '@/components/auth/WithAuth';
import RequestTypeView from '@/components/requests/RequestTypeView';

function BatteryChargingRequestsPage() {
  return (
    <WithAuth>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}>
        <RequestTypeView type="battery_charging" title="Battery Charging Queue" icon={<BatteryChargingFullRounded />} />
      </Suspense>
    </WithAuth>
  );
}

export default BatteryChargingRequestsPage;
