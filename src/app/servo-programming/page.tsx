'use client';

import React from 'react';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import {
  Typography,
  List,
  ListItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Container,
  Paper,
  Box,
} from '@mui/material';
import Image from 'next/image';

export default function ServoProgrammingPage() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['documentation.view']}>
        <ServoProgrammingContent />
      </WithPermissions>
    </WithAuth>
  );
}

function ServoProgrammingContent() {
  const auto_rows = [
    { mode: "Continuous Mode (C)", behave: "Sweeping direction and speed" },
    { mode: "Servo Mode (S)", behave: "Sweeping between limits" },
  ];

  const manual_rows = [
    {
      mode: "Continuous Mode (C)",
      left: "Counterclockwise Rotation",
      prog: "Stopped",
      right: "Clockwise Rotation",
    },
    {
      mode: "Servo Mode (S)",
      left: "Move to left limit",
      prog: "Move to center position",
      right: "Move to right limit",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{ mb: 3, fontWeight: 700 }}
          color="inherit"
        >
          Servo Programming
        </Typography>

        <Typography component="h2" variant="h5" sx={{ mb: 2 }} color="inherit">
          Switching Modes
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          Follow the steps below to switch a REV Smart Robot Servo between
          Continuous Mode and Servo Mode. The figure below shows the process to
          select Continuous Mode.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Image
            src="/images/Servo_Programming/servo_switch.png"
            alt="Servo Mode Switch"
            width={600}
            height={400}
            style={{
              maxHeight: '400px',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
        
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          1. Connect the SRS to the programmer.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          2. Turn on the programmer. Slide the mode switch to the desired mode: C
          - Continuous, S - Servo.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          3. Slide the mode switch to the desired mode: C - Continuous, S - Servo.
          Press and release the PROGRAM button once.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          4. Press and release the PROGRAM button once.
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          5. The PROGRAM LED should blink and then stay solid indicating success.
        </Typography>

        <Typography
          component="h2"
          variant="h5"
          sx={{ mb: 2, mt: 4 }}
          color="inherit"
        >
          Setting Angular Limits
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          Follow the steps below to set the angular limits for the Servo Mode. The
          figure below shows an example of setting a left and right limits at -30°
          and +60° respectively.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Image
            src="/images/Servo_Programming/servo_range.png"
            alt="Servo Range Setting"
            width={600}
            height={400}
            style={{
              maxHeight: '400px',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
        
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          1. Connect the SRS to the programmer.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          2. Turn on the programmer.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          3. Slide the mode switch to S position.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          4. This step is optional, but recommended to make it easier to see the
          valid limit ranges. Please refer to the SRS User&apos;s Manual for more
          information about the valid limit ranges.
        </Typography>
        <Typography component="p" sx={{ pl: 3, mb: 1 }} color="inherit">
          a. Press and release the TEST button twice to enter Manual Test Mode
          (see Test Modes for more information)
        </Typography>
        <Typography component="p" sx={{ pl: 3, mb: 1 }} color="inherit">
          b. Press the PROGRAM button to center the servo at 0°.
        </Typography>
        <Typography component="p" sx={{ pl: 3, mb: 1 }} color="inherit">
          c. Press and release the TEST button once to leave the test mode.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          5. Manually rotate the servo to the desired left limit position.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          6. Press and release the LEFT button. The LEFT LED will illuminate if
          the position is valid.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          7. Manually rotate the servo to the desired right limit position.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          8. Press and release the RIGHT button. The RIGHT LED will illuminate if
          the position is valid.
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          9. After both limits are set, press and release the PROGRAM button. The
          PROGRAM LED should blink and then stay solid indicating success.
        </Typography>

        <Typography
          component="h2"
          variant="h5"
          sx={{ mb: 2, mt: 4 }}
          color="inherit"
        >
          Resetting to Default
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          Follow the steps below to reset the Smart Robot Servo to its default
          mode and limits. The figure below shows the process to reset to
          defaults.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Image
            src="/images/Servo_Programming/servo_default.png"
            alt="Servo Default Reset"
            width={600}
            height={400}
            style={{
              maxHeight: '400px',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
        
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          1. Connect the SRS to the programmer.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          2. Turn on the programmer.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          3. Slide the mode switch to S position.
        </Typography>
        <Typography component="p" sx={{ mb: 1 }} color="inherit">
          4. Press and hold the PROGRAM button for at least 5 seconds.
        </Typography>
        <Typography component="p" sx={{ mb: 3 }} color="inherit">
          5. The LEDs will blink and then the PROGRAM LED will stay solid
          indicating success.
        </Typography>

        <Typography
          component="h2"
          variant="h5"
          sx={{ mb: 2, mt: 4 }}
          color="inherit"
        >
          Test Modes
        </Typography>
        <Typography component="p" sx={{ mb: 2 }} color="inherit">
          In either Continuous or Servo Modes, pressing and releasing the TEST
          button cycles through the two test modes:
        </Typography>
        <List
          sx={{
            listStyleType: 'disc',
            pl: 2,
            ml: 5,
            mb: 3,
            '& .MuiListItem-root': {
              display: 'list-item',
            },
          }}
        >
          <ListItem sx={{ py: 0, my: 0 }}>
            1st press - Automatic Sweep Mode
          </ListItem>
          <ListItem sx={{ py: 0, my: 0 }}>2nd press - Manual Test Mode</ListItem>
          <ListItem sx={{ py: 0, my: 0 }}>
            3rd press - Return to default state
          </ListItem>
        </List>

        <Typography
          component="h3"
          variant="h6"
          sx={{ mb: 2, mt: 3 }}
          color="inherit"
        >
          Automatic Sweep Mode
        </Typography>
        <Typography component="p" sx={{ mb: 2 }} color="inherit">
          In Automatic Sweep Mode, the SRS Programmer will automatically sweep the
          SRS through motions appropriate for its configuration. The table below
          describes the behavior based on the configured mode.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Table sx={{ maxWidth: 550 }} size="small">
            <TableHead>
              <TableRow>
                <TableCell>Servo and Programmer Mode</TableCell>
                <TableCell>Behavior</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auto_rows.map((row) => (
                <TableRow
                  key={row.mode}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.mode}
                  </TableCell>
                  <TableCell>{row.behave}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Typography
          component="h3"
          variant="h6"
          sx={{ mb: 2, mt: 3 }}
          color="inherit"
        >
          Manual Test Mode
        </Typography>
        <Typography component="p" sx={{ mb: 2 }} color="inherit">
          In Manual Test Mode the LEFT, PROGRAM, and RIGHT buttons control the
          movement of the SRS. The table below describes how the SRS will behave
          based on the configured mode.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
          <Table sx={{ maxWidth: 850 }} size="small">
            <TableHead>
              <TableRow>
                <TableCell>Servo and Programmer Mode</TableCell>
                <TableCell>LEFT Button</TableCell>
                <TableCell>PROGRAM Button</TableCell>
                <TableCell>RIGHT Button</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {manual_rows.map((row) => (
                <TableRow
                  key={row.mode}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.mode}
                  </TableCell>
                  <TableCell>{row.left}</TableCell>
                  <TableCell>{row.prog}</TableCell>
                  <TableCell>{row.right}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Container>
  );
}