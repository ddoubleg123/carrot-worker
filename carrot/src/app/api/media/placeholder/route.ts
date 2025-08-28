import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return a 404 to indicate no video available
  // This will trigger the video error handler which can handle it gracefully
  return new NextResponse('Placeholder video not available', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
