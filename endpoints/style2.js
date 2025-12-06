const { spawn } = require('child_process');
const { escapeDrawtext } = require('./utils');

// Style 2: Single-step approach (text + fade in one command)
async function createVideoStyle2(imagePath, audioPath, quote, author, watermark, outputPath, maxDuration = null) {
  return new Promise((resolve, reject) => {
    // First get audio duration
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      audioPath
    ]);

    let duration = '';
    
    ffprobe.stdout.on('data', (data) => {
      duration += data.toString().trim();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get audio duration'));
        return;
      }

      const audioDuration = parseFloat(duration);
      const finalDuration = maxDuration ? Math.min(maxDuration, audioDuration) : audioDuration;
      const fadeInDuration = finalDuration * 0.75; // 75% fade in
      
      console.log(`Style 2 - Audio duration: ${audioDuration}s, Final duration: ${finalDuration}s, Fade in: ${fadeInDuration}s`);

      // Build text filters for BOTTOM placement
      let textFilterArray = [];
      
      // Add quote if provided and not empty
      if (quote && quote.trim() !== '') {
        const cleanQuote = escapeDrawtext(quote);
        textFilterArray.push(`drawtext=text='${cleanQuote}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-400:shadowcolor=black:shadowx=3:shadowy=3`);
      }
      
      // Add author if provided and not empty
      if (author && author.trim() !== '') {
        const cleanAuthor = escapeDrawtext(author);
        textFilterArray.push(`drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-280:shadowcolor=black:shadowx=2:shadowy=2`);
      }

      // Add watermark if provided and not empty
      if (watermark && watermark.trim() !== '') {
        const cleanWatermark = escapeDrawtext(watermark);
        textFilterArray.push(`drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`);
      }

      // Build final text filter
      const textFilters = textFilterArray.length > 0 ? textFilterArray.join(',') : null;

      // Build FFmpeg command (original approach with BOTTOM text)
      const args = [
        '-loop', '1',
        '-i', imagePath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', finalDuration.toString(),
        '-pix_fmt', 'yuv420p',
        '-vf', textFilters ? `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fade=in:st=0:d=${fadeInDuration}:color=black,${textFilters}` : `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,fade=in:st=0:d=${fadeInDuration}:color=black`,
        '-af', `afade=in:0:${fadeInDuration}`,
        '-y', outputPath
      ];

      console.log('Style 2: Creating video with single-step approach...');

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Style 2: Video created successfully');
          resolve(outputPath);
        } else {
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Style 2: FFmpeg failed with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Style 2: FFmpeg spawn error: ${error.message}`));
      });
    });
  });
}

module.exports = {
  createVideoStyle2
};
