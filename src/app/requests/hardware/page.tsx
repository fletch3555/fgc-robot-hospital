"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { BuildRounded } from "@mui/icons-material";
import { WithAuth } from '@/components/auth/WithAuth';
import RequestTypeView from '@/components/requests/RequestTypeView';

function HardwareRequestsPage() {
  return (
    <WithAuth>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}>
        <RequestTypeView type="hardware" title="Hardware Queue" icon={<BuildRounded />} />
      </Suspense>
    </WithAuth>
  );
}

export default HardwareRequestsPage;
