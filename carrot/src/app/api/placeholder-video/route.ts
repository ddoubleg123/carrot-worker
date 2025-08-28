import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Return a placeholder MP4 URL that matches the expected pattern
  const placeholderMp4Url = '/api/placeholder-video.mp4';
  
  return NextResponse.redirect(new URL(placeholderMp4Url, 'http://localhost:3000'));
}
