import { NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase, query } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const authz = await checkPermissions(['admin.dashboard']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const dateParams: string[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND created_at BETWEEN $1 AND $2';
      dateParams.push(startDate, endDate);
    }

    let reportData;

    switch (reportType) {
      case 'requests':
        reportData = await getRequestsReport(dateFilter, dateParams);
        break;
      case 'spare_parts':
        reportData = await getSparePartsReport(dateFilter, dateParams);
        break;
      case 'users':
        reportData = await getUsersReport(dateFilter, dateParams);
        break;
      case 'teams':
        reportData = await getTeamsReport(dateFilter, dateParams);
        break;
      case 'summary':
        reportData = await getSummaryReport(dateFilter, dateParams);
        break;
      case 'all':
      default:
        reportData = await getAllReports(dateFilter, dateParams);
        break;
    }

    return NextResponse.json(reportData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error generating report:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function getRequestsReport(dateFilter: string, dateParams: string[]) {
  const result = await query(
    `SELECT
      r.id,
      r.country_code,
      r.type,
      r.status,
      r.comments,
      r.created_at,
      r.updated_at,
      u1.name as submitted_by_name,
      u1.email as submitted_by_email,
      u2.name as assigned_to_name,
      u2.email as assigned_to_email,
      r.hardware_data,
      r.software_data,
      r.machine_shop_data,
      r.battery_charging_data
    FROM requests r
    LEFT JOIN users u1 ON r.submitted_by = u1.id
    LEFT JOIN users u2 ON r.assigned_to = u2.id
    WHERE 1=1 ${dateFilter}
    ORDER BY r.created_at DESC`,
    dateParams
  );

  const stats = await query(
    `SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
      COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN type = 'hardware' THEN 1 END) as hardware,
      COUNT(CASE WHEN type = 'software' THEN 1 END) as software,
      COUNT(CASE WHEN type = 'machine_shop' THEN 1 END) as machine_shop,
      COUNT(CASE WHEN type = 'battery_charging' THEN 1 END) as battery_charging
    FROM requests
    WHERE 1=1 ${dateFilter}`,
    dateParams
  );

  // Get most/least helped teams
  const teamActivity = await query(
    `SELECT
      country_code,
      COUNT(*) as request_count
    FROM requests
    WHERE 1=1 ${dateFilter}
    GROUP BY country_code
    ORDER BY request_count DESC`,
    dateParams
  );

  // Get hardware type breakdown
  const hardwareTypes = await query(
    `SELECT
      hardware_data->>'type' as hardware_type,
      COUNT(*) as count
    FROM requests
    WHERE type = 'hardware' AND hardware_data IS NOT NULL ${dateFilter.replace('WHERE 1=1', '')}
    GROUP BY hardware_data->>'type'
    ORDER BY count DESC`,
    dateFilter ? dateParams : []
  );

  // Get software language breakdown
  const softwareLanguages = await query(
    `SELECT
      software_data->>'programmingLanguage' as language,
      COUNT(*) as count
    FROM requests
    WHERE type = 'software' AND software_data IS NOT NULL ${dateFilter.replace('WHERE 1=1', '')}
    GROUP BY software_data->>'programmingLanguage'
    ORDER BY count DESC`,
    dateFilter ? dateParams : []
  );

  // Get machine shop actions breakdown
  const machineShopActions = await query(
    `SELECT
      machine_shop_data->>'action' as action,
      COUNT(*) as count
    FROM requests
    WHERE type = 'machine_shop' AND machine_shop_data IS NOT NULL ${dateFilter.replace('WHERE 1=1', '')}
    GROUP BY machine_shop_data->>'action'
    ORDER BY count DESC`,
    dateFilter ? dateParams : []
  );

  // Get battery type breakdown
  const batteryTypes = await query(
    `SELECT
      battery_charging_data->>'batteryType' as battery_type,
      COUNT(*) as count
    FROM requests
    WHERE type = 'battery_charging' AND battery_charging_data IS NOT NULL ${dateFilter.replace('WHERE 1=1', '')}
    GROUP BY battery_charging_data->>'batteryType'
    ORDER BY count DESC`,
    dateFilter ? dateParams : []
  );

  return {
    type: 'requests',
    data: result.rows,
    stats: stats.rows[0],
    count: result.rows.length,
    analytics: {
      mostHelpedTeams: teamActivity.rows.slice(0, 10),
      leastHelpedTeams: teamActivity.rows.slice(-10).reverse(),
      hardwareTypes: hardwareTypes.rows,
      softwareLanguages: softwareLanguages.rows,
      machineShopActions: machineShopActions.rows,
      batteryTypes: batteryTypes.rows
    }
  };
}

async function getSparePartsReport(dateFilter: string, dateParams: string[]) {
  const result = await query(
    `SELECT
      sp.id,
      sp.country_code,
      sp.item_name,
      sp.quantity,
      sp.is_loan,
      sp.status,
      sp.notes,
      sp.created_at,
      sp.updated_at,
      u1.name as submitted_by_name,
      u1.email as submitted_by_email,
      u2.name as handled_by_name,
      u2.email as handled_by_email
    FROM spare_parts sp
    LEFT JOIN users u1 ON sp.submitted_by = u1.id
    LEFT JOIN users u2 ON sp.handled_by = u2.id
    WHERE 1=1 ${dateFilter}
    ORDER BY sp.created_at DESC`,
    dateParams
  );

  const stats = await query(
    `SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued,
      COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
      COUNT(CASE WHEN is_loan = true THEN 1 END) as loans,
      SUM(quantity) as total_quantity
    FROM spare_parts
    WHERE 1=1 ${dateFilter}`,
    dateParams
  );

  // Get most/least commonly requested parts
  const partFrequency = await query(
    `SELECT
      item_name,
      COUNT(*) as request_count,
      SUM(quantity) as total_quantity
    FROM spare_parts
    WHERE 1=1 ${dateFilter}
    GROUP BY item_name
    ORDER BY request_count DESC`,
    dateParams
  );

  // Get most/least helped teams
  const teamActivity = await query(
    `SELECT
      country_code,
      COUNT(*) as transaction_count,
      SUM(quantity) as total_quantity
    FROM spare_parts
    WHERE 1=1 ${dateFilter}
    GROUP BY country_code
    ORDER BY transaction_count DESC`,
    dateParams
  );

  return {
    type: 'spare_parts',
    data: result.rows,
    stats: stats.rows[0],
    count: result.rows.length,
    analytics: {
      mostRequestedParts: partFrequency.rows.slice(0, 10),
      leastRequestedParts: partFrequency.rows.slice(-10).reverse(),
      mostHelpedTeams: teamActivity.rows.slice(0, 10),
      leastHelpedTeams: teamActivity.rows.slice(-10).reverse()
    }
  };
}

async function getUsersReport(dateFilter: string, dateParams: string[]) {
  const result = await query(
    `SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      u.updated_at,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'role', r.name,
            'granted_at', ur.granted_at
          )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE 1=1 ${dateFilter}
    GROUP BY u.id, u.name, u.email, u.created_at, u.updated_at
    ORDER BY u.created_at DESC`,
    dateParams
  );

  const stats = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_last_7_days
    FROM users
    WHERE 1=1 ${dateFilter}`,
    dateParams
  );

  return {
    type: 'users',
    data: result.rows,
    stats: stats.rows[0],
    count: result.rows.length
  };
}

async function getTeamsReport(dateFilter: string, dateParams: string[]) {
  const result = await query(
    `SELECT 
      t.id,
      t.country_code,
      t.country_name,
      t.created_at,
      t.updated_at,
      COUNT(DISTINCT r.id) as total_requests,
      COUNT(DISTINCT sp.id) as total_spare_parts
    FROM teams t
    LEFT JOIN requests r ON t.country_code = r.country_code
    LEFT JOIN spare_parts sp ON t.country_code = sp.country_code
    WHERE 1=1 ${dateFilter}
    GROUP BY t.id, t.country_code, t.country_name, t.created_at, t.updated_at
    ORDER BY t.country_name ASC`,
    dateParams
  );

  const stats = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_last_7_days
    FROM teams
    WHERE 1=1 ${dateFilter}`,
    dateParams
  );

  return {
    type: 'teams',
    data: result.rows,
    stats: stats.rows[0],
    count: result.rows.length
  };
}

async function getSummaryReport(dateFilter: string, dateParams: string[]) {
  const [requests, spareParts, users, teams] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM requests WHERE 1=1 ${dateFilter}`, dateParams),
    query(`SELECT COUNT(*) as count FROM spare_parts WHERE 1=1 ${dateFilter}`, dateParams),
    query(`SELECT COUNT(*) as count FROM users WHERE 1=1 ${dateFilter}`, dateParams),
    query(`SELECT COUNT(*) as count FROM teams WHERE 1=1 ${dateFilter}`, dateParams)
  ]);

  const requestsByType = await query(
    `SELECT type, COUNT(*) as count 
     FROM requests 
     WHERE 1=1 ${dateFilter}
     GROUP BY type`,
    dateParams
  );

  const requestsByStatus = await query(
    `SELECT status, COUNT(*) as count 
     FROM requests 
     WHERE 1=1 ${dateFilter}
     GROUP BY status`,
    dateParams
  );

  const topCountries = await query(
    `SELECT 
      country_code,
      COUNT(*) as request_count
     FROM requests 
     WHERE 1=1 ${dateFilter}
     GROUP BY country_code
     ORDER BY request_count DESC
     LIMIT 10`,
    dateParams
  );

  return {
    type: 'summary',
    data: {
      totals: {
        requests: parseInt(String(requests.rows[0].count)),
        spareParts: parseInt(String(spareParts.rows[0].count)),
        users: parseInt(String(users.rows[0].count)),
        teams: parseInt(String(teams.rows[0].count))
      },
      requestsByType: requestsByType.rows,
      requestsByStatus: requestsByStatus.rows,
      topCountries: topCountries.rows
    }
  };
}

async function getAllReports(dateFilter: string, dateParams: string[]) {
  const [requests, spareParts, users, teams, summary] = await Promise.all([
    getRequestsReport(dateFilter, dateParams),
    getSparePartsReport(dateFilter, dateParams),
    getUsersReport(dateFilter, dateParams),
    getTeamsReport(dateFilter, dateParams),
    getSummaryReport(dateFilter, dateParams)
  ]);

  return {
    type: 'all',
    requests,
    spareParts,
    users,
    teams,
    summary
  };
}