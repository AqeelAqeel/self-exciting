// FFmpeg Video Stitcher
// Concatenates video segments with audio overlay

import { spawn } from 'child_process';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface VideoStitchConfig {
  videos: Array<{
    url: string;
    duration?: number;
  }>;
  audioTrack?: {
    url: string;
    volume?: number; // 0-1, default 0.3
  };
  transitions?: {
    type: 'none' | 'fade' | 'crossfade';
    duration?: number; // seconds, default 0.5
  };
  output?: {
    resolution?: '1080x1920' | '720x1280' | '480x854';
    format?: 'mp4' | 'webm';
  };
}

export interface StitchProgress {
  stage: 'downloading' | 'processing' | 'encoding' | 'complete';
  progress: number; // 0-100
  message?: string;
}

export interface StitchResult {
  outputPath: string;
  duration: number;
  ffmpegCommand: string;
}

/**
 * Download a file from URL to local temp path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * Run FFmpeg command and capture output
 */
function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let stdout = '';
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(stdout.trim()));
      } else {
        resolve(0);
      }
    });

    process.on('error', () => {
      resolve(0);
    });
  });
}

/**
 * Stitch videos together with optional audio overlay
 */
export async function stitchVideos(
  config: VideoStitchConfig,
  onProgress?: (progress: StitchProgress) => void
): Promise<StitchResult> {
  const workDir = join(tmpdir(), `stitch-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const localVideos: string[] = [];
  const outputPath = join(workDir, `output.${config.output?.format || 'mp4'}`);
  let audioPath: string | null = null;

  try {
    // Stage 1: Download all videos
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Downloading video segments...' });

    for (let i = 0; i < config.videos.length; i++) {
      const video = config.videos[i];
      const localPath = join(workDir, `video_${i}.mp4`);
      await downloadFile(video.url, localPath);
      localVideos.push(localPath);
      onProgress?.({
        stage: 'downloading',
        progress: Math.round(((i + 1) / config.videos.length) * 50),
        message: `Downloaded segment ${i + 1}/${config.videos.length}`,
      });
    }

    // Download audio if provided
    if (config.audioTrack?.url) {
      audioPath = join(workDir, 'audio.mp3');
      await downloadFile(config.audioTrack.url, audioPath);
    }

    onProgress?.({ stage: 'processing', progress: 50, message: 'Processing videos...' });

    // Stage 2: Build FFmpeg command
    let ffmpegCommand: string;
    const ffmpegArgs: string[] = ['-y']; // Overwrite output

    if (config.transitions?.type === 'crossfade' && localVideos.length > 1) {
      // Complex filter for crossfade transitions
      const transitionDuration = config.transitions.duration || 0.5;

      // Add all inputs
      for (const video of localVideos) {
        ffmpegArgs.push('-i', video);
      }
      if (audioPath) {
        ffmpegArgs.push('-i', audioPath);
      }

      // Build complex filter graph
      let filterComplex = '';
      let lastOutput = '[0:v]';

      for (let i = 1; i < localVideos.length; i++) {
        const offset = (i * 5) - transitionDuration; // Assume ~5s per segment
        const output = i === localVideos.length - 1 ? '[vout]' : `[v${i}]`;
        filterComplex += `${lastOutput}[${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${output}`;
        if (i < localVideos.length - 1) {
          filterComplex += ';';
        }
        lastOutput = `[v${i}]`;
      }

      ffmpegArgs.push('-filter_complex', filterComplex);
      ffmpegArgs.push('-map', '[vout]');

      if (audioPath) {
        const volume = config.audioTrack?.volume || 0.3;
        ffmpegArgs.push('-map', `${localVideos.length}:a`);
        ffmpegArgs.push('-af', `volume=${volume}`);
      }
    } else {
      // Simple concatenation with concat demuxer
      const concatListPath = join(workDir, 'concat.txt');
      const concatContent = localVideos.map((v) => `file '${v}'`).join('\n');
      await writeFile(concatListPath, concatContent);

      ffmpegArgs.push(
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath
      );

      if (audioPath) {
        ffmpegArgs.push('-i', audioPath);
        const volume = config.audioTrack?.volume || 0.3;
        ffmpegArgs.push(
          '-filter_complex',
          `[1:a]volume=${volume}[music];[0:a][music]amix=inputs=2:duration=first[aout]`,
          '-map', '0:v',
          '-map', '[aout]'
        );
      }
    }

    // Output settings
    const resolution = config.output?.resolution || '1080x1920';
    const [width, height] = resolution.split('x');

    ffmpegArgs.push(
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      outputPath
    );

    ffmpegCommand = `ffmpeg ${ffmpegArgs.join(' ')}`;

    onProgress?.({ stage: 'encoding', progress: 70, message: 'Encoding final video...' });

    // Run FFmpeg
    await runFFmpeg(ffmpegArgs);

    // Get output duration
    const duration = await getVideoDuration(outputPath);

    onProgress?.({ stage: 'complete', progress: 100, message: 'Video composition complete' });

    return {
      outputPath,
      duration,
      ffmpegCommand,
    };
  } catch (error) {
    // Cleanup on error
    for (const file of localVideos) {
      await unlink(file).catch(() => {});
    }
    if (audioPath) {
      await unlink(audioPath).catch(() => {});
    }
    throw error;
  }
}

/**
 * Read the stitched video file as a buffer for upload
 */
export async function readVideoFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/**
 * Cleanup temporary files
 */
export async function cleanupStitchFiles(workDir: string): Promise<void> {
  const { rm } = await import('fs/promises');
  await rm(workDir, { recursive: true, force: true });
}
