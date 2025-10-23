'use client';

import React from 'react';
import { WithAuth } from '@/components/auth/WithAuth';
import { WithPermissions } from '@/components/auth/WithPermissions';
import {
  Alert,
  List,
  ListItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Container,
  Paper,
  Box,
} from '@mui/material';
import Image from 'next/image';

const img_style = {
  maxWidth: '100%',
  minWidth: 100,
  height: 'auto',
  padding: 0,
  margin: 0,
};

function ServoGearsPage() {
  const gears_rows = [
    {
      img: (
        <Image
          src="/images/Servo_Gears/step1.png"
          alt="Step 1"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Remove the four screws that hold the upper casing.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step2.png"
          alt="Step 2"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Remove the upper casing. Orient the servo so that the servo wire is to the left-hand side.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step3.png"
          alt="Step 3"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Remove the the reduction and output gears. The last silver gear is removed with the axle as one unit.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step4.png"
          alt="Step 4"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Remove the axle pin from the silver gear and replace gear if necessary. Note: replacement gears are shipped un-greased. Please grease all replacement gears before installing.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step5.png"
          alt="Step 5"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Attach silver gear to the axle pin.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step6.png"
          alt="Step 6"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Place the new silver gear onto the servo unit making sure contact with the servo motor\'s output shaft first, then slide the axle into the axle opening.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step7.png"
          alt="Step 7"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Place the second gear in place. Make sure the lower level of teeth on this gear mesh with the upper level of teeth on the silver gear.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step8.png"
          alt="Step 8"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Next place the output shaft gear in position. Make sure to align the slot in the gear with the tab on the servo.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step9.png"
          alt="Step 9"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Once the output shaft is in place correctly, it should be seated securely but not touching any other gears.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step10.png"
          alt="Step 10"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Place the final gear on the middle shaft. It should first mesh with the output shaft on its lower set of teeth, and then its upper teeth will mesh with the gear on the right shaft.',
    },
    {
      img: (
        <Image
          src="/images/Servo_Gears/step11.png"
          alt="Step 11"
          width={300}
          height={200}
          style={img_style}
        />
      ),
      text: 'Finally, reattach the top plastic cover, making sure to place it directly down on top of the gears so that they don\'t become misaligned. Reattach the 4 screws and the servo is ready to operate.',
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
          Servo Gear Swap
        </Typography>

        <Typography component="h2" variant="h5" sx={{ mb: 2 }} color="inherit">
          Tools Needed
        </Typography>
        <Typography component="p" sx={{ mb: 2 }} color="inherit">
          To replace the gear set in the Smart Robot Servo you will need the
          following items:
        </Typography>
        <List
          sx={{
            listStyleType: 'disc',
            pl: 2,
            ml: 5,
            '& .MuiListItem-root': {
              display: 'list-item',
            },
          }}
        >
          <ListItem sx={{ py: 0, my: 0 }}>
            Smart Robot Servo (REV-41-1097) - Quantity 1
          </ListItem>
          <ListItem sx={{ py: 0, my: 0 }}>
            Replacement Gear Set (REV-41-1168) - Quantity 1
          </ListItem>
          <ListItem sx={{ py: 0, my: 0 }}>
            Phillips Head Screwdriver (PH0) - Quantity 1
          </ListItem>
        </List>
        
        <Alert severity="warning" sx={{ my: 3 }}>
          The replacement gears are shipped un-greased. They need grease to run
          smoothly, so make sure there is enough grease in the gearbox, and if not,
          add equivalent of ~1/4&quot; diameter sphere of grease to gears in the
          gearbox.
        </Alert>
        
        <Typography component="h2" variant="h5" sx={{ mb: 3 }} color="inherit">
          Replacing Gears Walkthrough
        </Typography>
        
        {/* Desktop Table View */}
        <Box sx={{
          display: { xs: 'none', md: 'block' },
          overflowX: 'auto'
        }}>
          <Table sx={{ minWidth: 650 }} size="small">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '70%' }} />
            </colgroup>
            <TableBody>
              {gears_rows.map((row, index) => (
                <TableRow
                  key={`step-${index + 1}`}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                  }}
                >
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ minWidth: 220, maxWidth: 400, p: 2 }}
                  >
                    {row.img}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 500, p: 2 }}>
                    {row.text}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Mobile Card View */}
        <Box sx={{
          display: { xs: 'block', md: 'none' }
        }}>
          {gears_rows.map((row, index) => (
            <Paper
              key={`step-${index + 1}`}
              elevation={2}
              sx={{
                p: 2,
                mb: 2,
                '&:last-child': { mb: 0 }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'primary.main'
                }}
              >
                Step {index + 1}
              </Typography>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 2
              }}>
                {row.img}
              </Box>
              <Typography variant="body1">
                {row.text}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </Container>
  );
}

function ServoGearsPageWithAuth() {
  return (
    <WithAuth>
      <WithPermissions requiredPermissions={['documentation.view']}>
        <ServoGearsPage />
      </WithPermissions>
    </WithAuth>
  );
}

export default ServoGearsPageWithAuth;