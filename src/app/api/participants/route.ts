import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';

export async function GET() {
  try {
    await ensureInit();
    const result = await query('SELECT * FROM participants ORDER BY id ASC');
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('GET /api/participants error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureInit();
    const { name } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Insert or return existing
    const existing = await query('SELECT * FROM participants WHERE name = $1', [name.trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    const result = await query(
      'INSERT INTO participants (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('POST /api/participants error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
