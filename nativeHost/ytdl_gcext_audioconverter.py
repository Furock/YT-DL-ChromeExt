import subprocess
from ytdl_gcext_logger import log
import os
import datetime

FORMAT_CODECS = {
    'mp3': ['mp3'],
    'aac': ['aac'],
    'm4a': ['aac','alac'], 
    'ogg': ['vorbis', 'opus'],
    'opus': ['opus'],
    'flac': ['flac'],
    'wav': ['pcm']
}

CODEC_ENCODER = {
    'mp3': 'libmp3lame',
    'aac': 'aac',
    'alac': 'alac', 
    'vorbis': 'libvorbis',
    'opus': 'libopus',
    'flac': 'flac',
    'pcm': 'pcm_s16le'
}

CODEC_BITRATES = {
    'mp3': 256000,
    'aac': 224000,
    'vorbis': 500000,
    'opus': 510000,
}

destinationFormat = "'NO FORMAT SET'"

def convertFile(ctx):
    """
    Converts a file out of a yt-dlp context ctx after other postprocessing is finished.
    """
    currentFormat = ctx.get("info_dict", {}).get("ext")
    if ctx.get("postprocessor") == "MoveFiles" and ctx.get("status") == "finished" and currentFormat != destinationFormat:
        log("Start conversion to " + destinationFormat)
        filepath = ctx.get("info_dict", {}).get("filepath", "NO_FILE")
        def cmd(stream):
            return ["cmd", "/c", "ffprobe", 
                            "-v", "error", 
                            "-select_streams", "a:0", 
                            "-show_entries", f"stream={stream}", 
                            "-of", "default=noprint_wrappers=1:nokey=1", 
                            filepath]
        codecCmd = cmd(stream="codec_name")
        log(" ".join(codecCmd))
        codec = subprocess.Popen(codecCmd, text=True, stdout=subprocess.PIPE).stdout.readline().strip()
        log("Codec:", codec)

        bitrateCmd = cmd(stream="bit_rate")
        log(" ".join(bitrateCmd))
        bitrate = subprocess.Popen(bitrateCmd, text=True, stdout=subprocess.PIPE).stdout.readline().strip()
        log("Bitrate:", bitrate)

        def ffmpegCmd(targetCodec):
            cmd = ["cmd", "/c", "ffmpeg", "-n", 
                            "-i", filepath]
            if codec == targetCodec:
                cmd += ["-acodec", "copy"]
            else:
                cmd += ["-acodec", CODEC_ENCODER.get(targetCodec, f"UNKNOWN_CODEC({targetCodec})")]
                if targetCodec in CODEC_BITRATES:
                    maxBitRate = min(int(bitrate), CODEC_BITRATES.get(targetCodec, -1))
                    cmd += ["-ab", str(maxBitRate)]

            
            if targetCodec != destinationFormat:
                newFile = filepath.replace('.'+currentFormat, f" - {targetCodec}.{destinationFormat}")
            else:
                newFile = filepath.replace('.'+currentFormat, '.'+destinationFormat)

            if os.path.exists(newFile):
                base, ext = os.path.splitext(newFile)
                now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                newFile = base + " - " + now + ext
            cmd += [newFile]
            return cmd

        for targetCodec in FORMAT_CODECS.get(destinationFormat):
            ffmpegCommand = ffmpegCmd(targetCodec=targetCodec)
            log(' '.join([str(v) for v in ffmpegCommand]))
            p = subprocess.Popen(ffmpegCommand, text=True, stdout=subprocess.PIPE)
            code = p.wait()
            log(f"Conversion to {targetCodec} finished with code {code}")
