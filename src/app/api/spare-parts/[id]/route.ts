import { NextRequest, NextResponse } from 'next/server';
import { SparePart } from '@/models/SparePart';
import { connectToDatabase } from '@/lib/database';
import { checkPermissions } from '@/lib/authz';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['spare_parts.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();
    
    const sparePart = await SparePart.findById(params.id);

    if (!sparePart) {
      return NextResponse.json({ error: 'Spare part request not found' }, { status: 404 });
    }

    return NextResponse.json(sparePart);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['spare_parts.edit']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();
    
    const data = await request.json();
    
    const updatedSparePart = await SparePart.update(params.id, data);
    
    if (!updatedSparePart) {
      return NextResponse.json({ error: 'Spare part request not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSparePart);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['spare_parts.delete']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const sparePart = await SparePart.findById(params.id);
    
    if (!sparePart) {
      return NextResponse.json({ error: 'Spare part request not found' }, { status: 404 });
    }

    await SparePart.delete(params.id);

    return NextResponse.json({ message: 'Spare part request deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}