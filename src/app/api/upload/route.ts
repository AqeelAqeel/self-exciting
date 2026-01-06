import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { generateUniqueFilename } from '@/lib/utils';
import type { UploadResponse } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer and write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Handle multiple file uploads
export async function PUT(request: NextRequest): Promise<NextResponse<{ results: UploadResponse[] }>> {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { results: [{ success: false, error: 'No files provided' }] },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const results: UploadResponse[] = [];

    for (const file of files) {
      try {
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({ success: false, error: `Invalid file type: ${file.type}` });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          results.push({ success: false, error: 'File too large' });
          continue;
        }

        const filename = generateUniqueFilename(file.name);
        const filepath = path.join(UPLOAD_DIR, filename);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        results.push({
          success: true,
          url: `/uploads/${filename}`,
          filename,
        });
      } catch {
        results.push({ success: false, error: 'Failed to process file' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Multi-upload error:', error);
    return NextResponse.json(
      { results: [{ success: false, error: 'Upload failed' }] },
      { status: 500 }
    );
  }
}
