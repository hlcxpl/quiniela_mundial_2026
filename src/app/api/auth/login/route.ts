import { NextResponse } from 'next/server';
import { query, ensureInit } from '@/utils/db';
import { hashPassword, verifyPassword } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    await ensureInit();
    const { username, password } = await request.json();

    if (!username || !password || username.trim() === '' || password.trim() === '') {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Fetch user
    const result = await query(
      'SELECT id, name, password_hash FROM participants WHERE LOWER(name) = LOWER($1)',
      [trimmedUsername]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 400 });
    }

    const user = result.rows[0];

    // Handle legacy seeded users with null password hashes
    if (user.password_hash === null) {
      // Allow linking a password on first login for legacy users
      const passwordHash = hashPassword(password);
      await query('UPDATE participants SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
      return NextResponse.json({ id: user.id, name: user.name });
    }

    // Verify submitted password securely
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 400 });
    }

    return NextResponse.json({ id: user.id, name: user.name });
  } catch (error: any) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
