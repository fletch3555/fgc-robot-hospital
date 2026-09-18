#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Database configuration
const pool = new Pool({
  user: 'robot_hospital_user',
  host: 'localhost',
  database: 'robot_hospital',
  password: 'robot_hospital_password',
  port: 5432,
});

// Path to the CSV file
const csvFilePath = path.join(__dirname, '..', 'FGC_2026_KoP.csv');

async function importFGCInventory() {
  const client = await pool.connect();
  
  try {
    console.log('Starting FGC inventory import...');
    
    // Clear existing FGC inventory data
    await client.query('DELETE FROM fgc_inventory');
    console.log('Cleared existing inventory data');
    
    // Read and parse CSV
    const items = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Extract data from CSV columns
          const groupName = row['Category'] || '';
          const partNumber = row['Part Number'] || '';
          const description = row['Description'] || '';
          const quantity = parseInt(row['QTY']) || 0;
          const imageUrl = row['Image'] || null;
          
          // Skip rows with missing essential data
          if (!groupName.trim() || !partNumber.trim() || !description.trim()) {
            return;
          }
          
          items.push({
            groupName: groupName.trim(),
            partNumber: partNumber.trim(),
            description: description.trim(),
            quantity,
            imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : null
          });
        })
        .on('end', async () => {
          try {
            console.log(`Parsed ${items.length} items from CSV`);
            
            // Insert items into database
            let insertedCount = 0;
            
            for (const item of items) {
              try {
                await client.query(
                  `INSERT INTO fgc_inventory (group_name, part_number, description, quantity, image_url)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [item.groupName, item.partNumber, item.description, item.quantity, item.imageUrl]
                );
                insertedCount++;
              } catch (error) {
                console.error(`Error inserting item ${item.partNumber}:`, error.message);
              }
            }
            
            console.log(`Successfully imported ${insertedCount} items into fgc_inventory table`);
            
            // Show summary by group
            const summary = await client.query(`
              SELECT 
                group_name,
                COUNT(*) as item_count,
                SUM(quantity) as total_quantity
              FROM fgc_inventory 
              GROUP BY group_name 
              ORDER BY group_name
            `);
            
            console.log('\nInventory Summary by Group:');
            console.log('═'.repeat(60));
            summary.rows.forEach(row => {
              console.log(`${row.group_name.padEnd(35)} | ${row.item_count.toString().padStart(5)} items | ${row.total_quantity.toString().padStart(6)} total qty`);
            });
            
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the import
importFGCInventory()
  .then(() => {
    console.log('\nFGC inventory import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });