"use client";

import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { ComputerRounded } from "@mui/icons-material";
import { WithAuth } from '@/components/auth/WithAuth';
import RequestTypeView from '@/components/requests/RequestTypeView';

function SoftwareRequestsPage() {
  return (
    <WithAuth>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}>
        <RequestTypeView type="software" title="Software Queue" icon={<ComputerRounded />} />
      </Suspense>
    </WithAuth>
  );
}

export default SoftwareRequestsPage;
