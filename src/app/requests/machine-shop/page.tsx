"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { PrecisionManufacturingRounded } from "@mui/icons-material";
import { WithAuth } from '@/components/auth/WithAuth';
import RequestTypeView from '@/components/requests/RequestTypeView';

function MachineShopRequestsPage() {
  return (
    <WithAuth>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}>
        <RequestTypeView type="machine_shop" title="Machine Shop Queue" icon={<PrecisionManufacturingRounded />} />
      </Suspense>
    </WithAuth>
  );
}

export default MachineShopRequestsPage;
