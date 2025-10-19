import { NextRequest, NextResponse } from 'next/server';
import { kopInventory } from '@/data/kop-inventory';

// This API route is now deprecated in favor of static data.
// It's kept for backward compatibility but uses static data instead of database.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const dashboard = searchParams.get('dashboard') === 'true';
    
    const offset = (page - 1) * limit;
    
    // If dashboard is requested, return summary data
    if (dashboard) {
      return NextResponse.json({
        summary: {
          total_items: kopInventory.length.toString(),
          total_quantity: kopInventory.reduce((sum, item) => sum + item.quantity, 0).toString()
        }
      });
    }
    
    // Filter items based on search
    let filteredItems = kopInventory;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = kopInventory.filter(item =>
        item.part_number.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.group_name.toLowerCase().includes(searchLower)
      );
    }
    
    const totalCount = filteredItems.length;
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get paginated items
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('FGC inventory API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FGC inventory' },
      { status: 500 }
    );
  }
}