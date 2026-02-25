import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const execAsync = promisify(exec)

// yt-dlp may be installed in ~/.local/bin which isn't in Node.js exec PATH
// Check common locations; fall back to 'yt-dlp' for production envs (Vercel)
const YTDLP_BIN = [
    '/home/ahmeed/.local/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
].find(p => { try { require('fs').accessSync(p); return true } catch { return false } }) ?? 'yt-dlp'

// ── Audio extraction via yt-dlp (NO ffmpeg needed) ────────────────────────────
// Downloads native webm/m4a audio — Groq Whisper accepts both formats directly.
// We deliberately skip auto-captions: YouTube auto-translates Cape Flats Afrikaans
// to broken English, making captions useless. Whisper with 'af' hint is far better.
export async function extractYouTubeAudio(
    url: string
): Promise<{ audioPath: string; mimeType: string; cleanup: () => Promise<void> }> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'decodedsound-'))
    const outputTemplate = path.join(tmpDir, 'audio.%(ext)s')

    // Prefer webm (no ffmpeg), fall back to m4a, then best available
    await execAsync(
        `"${YTDLP_BIN}" -f "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio" --no-playlist -o "${outputTemplate}" "${url}" 2>&1`,
        { timeout: 180000 }
    )

    // Find whatever file was downloaded
    const files = await fs.readdir(tmpDir)
    const audioFile = files.find(f => f.startsWith('audio.'))
    if (!audioFile) throw new Error('yt-dlp did not produce an audio file')

    const audioPath = path.join(tmpDir, audioFile)
    const ext = path.extname(audioFile).toLowerCase()
    const mimeType = ext === '.webm' ? 'audio/webm'
        : ext === '.m4a' ? 'audio/mp4'
            : ext === '.mp3' ? 'audio/mpeg'
                : 'audio/webm'

    const cleanup = async () => {
        try { await fs.rm(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    }

    return { audioPath, mimeType, cleanup }
}
