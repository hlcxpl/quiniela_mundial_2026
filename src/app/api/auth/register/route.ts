import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';
import { hashPassword } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    await ensureInit();
    const { username, password } = await request.json();

    if (!username || !password || username.trim() === '' || password.trim() === '') {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Check if user already exists
    const existing = await query('SELECT * FROM participants WHERE LOWER(name) = LOWER($1)', [trimmedUsername]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'El nombre de usuario ya está registrado' }, { status: 400 });
    }

    // Hash password using secure scrypt derivation
    const passwordHash = hashPassword(password);

    const result = await query(
      'INSERT INTO participants (name, password_hash) VALUES ($1, $2) RETURNING id, name',
      [trimmedUsername, passwordHash]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
