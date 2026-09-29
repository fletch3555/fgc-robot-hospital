"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import { IRequest, RequestType } from '@/lib/types';
import { useRequestForm } from '@/hooks/useRequestForm';
import RequestFormBody from '@/components/requests/RequestFormBody';

interface RequestFormModalProps {
  open: boolean;
  onClose: () => void;
  /** null = create a new request; a request = edit it. */
  request: IRequest | null;
  onRequestUpdated: (updatedRequest: IRequest) => void;
  /** Only required by callers that let this modal create requests. */
  onRequestCreated?: (newRequest: IRequest) => void;
  /** Create-mode only: preset the type and hide the other 3 options, for
   * callers hosted on a type-specific page (e.g. /requests/hardware). */
  fixedType?: RequestType;
}

export default function RequestFormModal({
  open,
  onClose,
  request,
  onRequestUpdated,
  onRequestCreated,
  fixedType,
}: RequestFormModalProps) {
  const mode: 'create' | 'edit' = request ? 'edit' : 'create';

  const formState = useRequestForm({
    mode,
    request,
    fixedType,
    active: open,
    onRequestCreated,
    onRequestUpdated,
    onSuccess: onClose,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { minHeight: '80vh' }
        }
      }}
    >
      <DialogTitle>
        {mode === 'create' ? 'Create New Request' : 'Edit Request'}
      </DialogTitle>
      <DialogContent dividers>
        <RequestFormBody state={formState} />
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
        {!formState.canSubmit() && !formState.loading && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            Please complete all required fields to {mode === 'create' ? 'submit' : 'update'} the request
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={formState.loading}>
            Cancel
          </Button>
          <Button
            onClick={formState.handleSubmit}
            variant="contained"
            disabled={formState.loading || !formState.canSubmit()}
            startIcon={formState.loading ? <CircularProgress size={20} /> : null}
          >
            {formState.submitLabel}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
