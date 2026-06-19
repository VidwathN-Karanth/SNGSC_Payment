import { NextResponse } from 'next/server';

// POST /api/admin/logout
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: 'admin_token',
    value: '',
    path: '/',
    maxAge: -1 // Immediately expires the cookie
  });
  return response;
}
