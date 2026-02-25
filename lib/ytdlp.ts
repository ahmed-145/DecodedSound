import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const execAsync = promisify(exec)

export async function extractYouTubeAudio(url: string): Promise<{ audioPath: string; cleanup: () => Promise<void> }> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'decodedsound-'))
    const outputPath = path.join(tmpDir, 'audio.mp3')

    // Extract audio with yt-dlp
    await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
        { timeout: 120000 }
    )

    const cleanup = async () => {
        try { await fs.rm(tmpDir, { recursive: true, force: true }) } catch { }
    }

    return { audioPath: outputPath, cleanup }
}

export async function fetchYouTubeCaptions(url: string): Promise<string | null> {
    try {
        // Try auto-captions first (fastest, no audio download needed)
        const { stdout } = await execAsync(
            `yt-dlp --skip-download --write-auto-sub --sub-lang en --convert-subs srt -o /tmp/yt_caps "${url}" 2>&1`,
            { timeout: 30000 }
        )
        if (stdout.includes('Writing video subtitles')) {
            const srtContent = await fs.readFile('/tmp/yt_caps.en.srt', 'utf-8')
            return stripSrtFormatting(srtContent)
        }
        return null
    } catch {
        return null
    }
}

function stripSrtFormatting(srt: string): string {
    return srt
        .split('\n')
        .filter(line => !/^\d+$/.test(line.trim()) && !/^\d{2}:\d{2}/.test(line.trim()))
        .join('\n')
        .replace(/<[^>]+>/g, '')
        .trim()
}
