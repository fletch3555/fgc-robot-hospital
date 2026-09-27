"use client";

import { WithAuth } from '@/components/auth/WithAuth';
import { useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import { IRequest } from '@/lib/types';
import { useRequestForm } from '@/hooks/useRequestForm';
import RequestFormBody from '@/components/requests/RequestFormBody';

// The landing page for every authenticated user -- a dedicated, always-there
// entry point for intake (the intake_clerk role's whole job, and the fastest
// path for anyone else who needs to log a request). Unlike each queue page's
// own locked "New Request" modal, this offers the full type picker and, since
// intake is a rapid-fire desk rather than a quick add from a list someone's
// already viewing, resets and stays here after each submission instead of
// navigating away -- ready for the next team in line.
function HospitalIntakePage() {
  const [successMessage, setSuccessMessage] = useState('');

  const formState = useRequestForm({
    mode: 'create',
    request: null,
    active: true,
    onRequestCreated: (newRequest: IRequest) => {
      setSuccessMessage(`${newRequest.type.replace('_', ' ')} request created.`);
    },
    onSuccess: () => {
      formState.resetForm();
    },
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <AssignmentIcon />
        Hospital Intake
      </Typography>

      {formState.typeOptions.length === 0 ? (
        <Alert severity="info">
          You don&apos;t have permission to create any requests. Use the sidebar to view a queue you have access to.
        </Alert>
      ) : (
        <>
          <RequestFormBody state={formState} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              onClick={formState.handleSubmit}
              variant="contained"
              size="large"
              disabled={formState.loading || !formState.isFormValid()}
              startIcon={formState.loading ? <CircularProgress size={20} /> : null}
            >
              {formState.loading ? 'Creating...' : 'Create Request'}
            </Button>
          </Box>
        </>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ textTransform: 'capitalize' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Wrap the component with authentication protection
function HospitalIntakePageWithAuth() {
  return (
    <WithAuth>
      <HospitalIntakePage />
    </WithAuth>
  );
}

export default HospitalIntakePageWithAuth;
