import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase, query } from '@/lib/database';
import { isValidCountryCode, getCountryName } from '@/lib/countryUtils';
import { kopInventory } from '@/data/kop-inventory';

export async function POST(request: NextRequest) {
  try {
    const authz = await checkPermissions(['spare_parts.issue']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();
    
    const data = await request.json();
    const { issuedItems, countryCode, notes, isLoan = false } = data;
    
    if (!issuedItems || !Array.isArray(issuedItems) || issuedItems.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Validate session has user ID
    if (!authz.session?.user?.id) {
      console.error('Session user ID is missing:', authz);
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Validate country code
    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    if (!isValidCountryCode(countryCode)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
    }

    // Validate all issued items exist in static FGC inventory data (if fgc_part_number provided)
    const itemsWithFgcPartNumbers = issuedItems.filter(item => item.fgcPartNumber);
    const fgcPartNumbers = itemsWithFgcPartNumbers.map(item => item.fgcPartNumber);
    const validPartNumbers = kopInventory.map(item => item.part_number);
    
    const invalidPartNumbers = fgcPartNumbers.filter(partNumber => !validPartNumbers.includes(partNumber));
    if (invalidPartNumbers.length > 0) {
      return NextResponse.json({ 
        error: `The following part numbers were not found in FGC inventory: ${invalidPartNumbers.join(', ')}` 
      }, { status: 400 });
    }

    // Create spare parts records for each item issued
    const issuedRecords = [];
    
    for (const item of issuedItems) {
      const result = await query(
        `INSERT INTO spare_parts (
          fgc_part_number,
          country_code,
          item_name,
          quantity,
          is_loan,
          status,
          submitted_by,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          item.fgcPartNumber || null,
          countryCode.toUpperCase(),
          item.itemName,
          item.quantity,
          isLoan,
          'issued',
          authz.session.user.id, // Attendant who issued the part
          notes ? [notes] : null
        ]
      );
      
      issuedRecords.push(result.rows[0]);
    }

    return NextResponse.json({
      message: 'Spare parts issued successfully',
      parts: issuedRecords
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Spare parts issuance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require spare parts view permission for this endpoint
    const authz = await checkPermissions(['spare_parts.view']);
    
    if (!authz.authorized) {
      return authz.response!;
    }
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const isDashboard = searchParams.get('dashboard') === 'true';
    const countryCode = searchParams.get('countryCode');

    if (isDashboard) {
      // Get counts for dashboard
      const countsResult = await query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM spare_parts 
        GROUP BY status
      `);

      // Get overdue loans (for example, loans issued more than 7 days ago that haven't been returned)
      const overdueResult = await query(`
        SELECT 
          sp.*,
          u.name as issued_to_name,
          u.email as issued_to_email
        FROM spare_parts sp
        LEFT JOIN users u ON sp.submitted_by = u.id
        WHERE sp.is_loan = true 
          AND sp.status = 'issued' 
          AND sp.created_at < NOW() - INTERVAL '7 days'
        ORDER BY sp.created_at ASC
      `);

      // Process the counts into the expected format
      const counts = {
        pending: 0, // Not applicable for direct issuance
        issued: 0,
        returned: 0,
        denied: 0 // Not applicable for direct issuance
      };

      countsResult.rows.forEach((row: { status: string; count: string }) => {
        const status = row.status;
        const count = parseInt(row.count);
        
        if (status === 'issued') {
          counts.issued = count;
        } else if (status === 'returned') {
          counts.returned = count;
        }
      });

      return NextResponse.json({ 
        counts, 
        overdueLoans: overdueResult.rows 
      });
    }

    let whereClause = 'WHERE 1=1';
    const values: unknown[] = [];
    let paramCount = 0;

    if (countryCode) {
      whereClause += ` AND sp.country_code = $${++paramCount}`;
      values.push(countryCode.toUpperCase());
    }

    const result = await query(
      `SELECT 
        sp.*,
        u1.name as issued_by_name, 
        u1.email as issued_by_email,
        u2.name as handled_by_name, 
        u2.email as handled_by_email
       FROM spare_parts sp
       LEFT JOIN users u1 ON sp.submitted_by = u1.id
       LEFT JOIN users u2 ON sp.handled_by = u2.id
       ${whereClause}
       ORDER BY sp.created_at DESC`,
      values
    );

    // Add country names and FGC inventory details from static data
    const resultWithEnhancedData = result.rows.map((row: { 
      country_code: string; 
      fgc_part_number: string | null; 
    }) => {
      const countryName = getCountryName(row.country_code);
      
      // Find FGC inventory details if part number exists
      let fgcDetails = null;
      if (row.fgc_part_number) {
        const fgcItem = kopInventory.find(item => item.part_number === row.fgc_part_number);
        if (fgcItem) {
          fgcDetails = {
            part_number: fgcItem.part_number,
            item_description: fgcItem.description,
            group_name: fgcItem.group_name
          };
        }
      }
      
      return {
        ...row,
        country_name: countryName,
        fgc_details: fgcDetails
      };
    });

    return NextResponse.json(resultWithEnhancedData);
  } catch (error: unknown) {
    console.error('Error fetching spare parts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}