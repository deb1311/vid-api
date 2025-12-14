const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { calculateTextLayout, escapeDrawtext } = require('./endpoints/utils');

// Debug function to test text filter construction
function debugTextFilter(quote, author, watermark, captions) {
  console.log('🔍 Debugging text filter construction...');
  
  // Build text filters using Vid-1.3 positioning logic
  let textFilters = [];

  // Check if captions are provided (they override quote)
  if (captions && captions.length > 0) {
    console.log(`📝 Using ${captions.length} timed captions instead of quote`);
    
    // Add timed captions
    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      if (!caption.text || caption.text.trim() === '') continue; // Skip empty captions
      
      const cleanText = escapeDrawtext(caption.text);
      if (cleanText.trim() === '') continue; // Skip if cleaned text is empty
      
      const startTime = caption.start || 0;
      const endTime = startTime + (caption.duration || 3);
      
      // Calculate text layout for this caption
      const captionLayout = calculateTextLayout(cleanText, '');
      
      // Use Vid-1.2 positioning logic
      const videoHeight = 800;
      const totalGroupHeight = captionLayout.totalTextHeight + videoHeight;
      const groupStartY = (1920 - totalGroupHeight) / 2;
      const textStartY = groupStartY;
      
      console.log(`Caption ${i + 1}: "${caption.text}" -> "${cleanText}"`);
      console.log(`  Layout: lines=${captionLayout.lines.length}, fontSize=${captionLayout.fontSize}`);
      console.log(`  Positioning: groupStartY=${groupStartY}, textStartY=${textStartY}`);
      
      // Add caption lines with timing
      for (let j = 0; j < captionLayout.lines.length; j++) {
        const lineY = textStartY + captionLayout.topPadding + (j * captionLayout.lineHeight);
        const cleanLine = escapeDrawtext(captionLayout.lines[j]);
        
        if (cleanLine.trim() !== '') { // Only add non-empty lines
          const filter = `drawtext=text='${cleanLine}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${captionLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`;
          textFilters.push(filter);
          console.log(`  Filter: ${filter}`);
        }
      }
    }
  } else if (quote && quote.trim() !== '') {
    console.log('📝 Using quote (no captions specified)');
    
    // Calculate text layout for quote
    const textLayout = calculateTextLayout(quote, author);
    
    // Use consistent Vid-1.2 positioning logic (matches editor exactly)
    const videoHeight = 800;
    const totalGroupHeight = textLayout.totalTextHeight + videoHeight;
    const groupStartY = (1920 - totalGroupHeight) / 2;
    const textStartY = groupStartY;
    console.log(`📐 Text positioning: groupStartY=${groupStartY}, textStartY=${textStartY}`);
    console.log(`📐 Text layout: lines=${textLayout.lines.length}, fontSize=${textLayout.fontSize}`);

    // Add quote lines
    for (let i = 0; i < textLayout.lines.length; i++) {
      const lineY = textStartY + textLayout.topPadding + (i * textLayout.lineHeight);
      const cleanText = escapeDrawtext(textLayout.lines[i]);
      
      console.log(`Quote line ${i + 1}: "${textLayout.lines[i]}" -> "${cleanText}"`);
      
      if (cleanText.trim() !== '') { // Only add non-empty lines
        const filter = `drawtext=text='${cleanText}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${textLayout.fontSize}:fontcolor=white:x=(w-text_w)/2:y=${lineY}:shadowcolor=black:shadowx=2:shadowy=2`;
        textFilters.push(filter);
        console.log(`  Filter: ${filter}`);
      }
    }

    // Add author - use editor's positioning (65% down the screen)
    if (author && author.trim() !== '') {
      const authorY = 1920 * 0.65; // Match editor: canvasHeight * 0.65
      const cleanAuthor = escapeDrawtext(author);
      
      console.log(`Author: "${author}" -> "${cleanAuthor}"`);
      
      if (cleanAuthor.trim() !== '') { // Only add non-empty author
        const filter = `drawtext=text='${cleanAuthor}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=${textLayout.authorFontSize}:fontcolor=white:x=(w-text_w)/2:y=${authorY}:shadowcolor=black:shadowx=2:shadowy=2`;
        textFilters.push(filter);
        console.log(`  Filter: ${filter}`);
      }
    }
  }

  // Add watermark at bottom (fixed position to prevent overlapping)
  if (watermark && watermark.trim() !== '') {
    const cleanWatermark = escapeDrawtext(watermark);
    console.log(`Watermark: "${watermark}" -> "${cleanWatermark}"`);
    
    if (cleanWatermark.trim() !== '') { // Only add non-empty watermark
      const filter = `drawtext=text='${cleanWatermark}':fontfile=C\\\\:/Windows/Fonts/arialbd.ttf:fontsize=40:fontcolor=white@0.4:x=(w-text_w)/2:y=${(1920 - 40) / 2}:shadowcolor=black@0.8:shadowx=3:shadowy=3`;
      textFilters.push(filter);
      console.log(`  Filter: ${filter}`);
    }
  }

  const textFilter = textFilters.length > 0 ? textFilters.join(',') : null;
  
  console.log(`\n🎯 Final text filter (${textFilters.length} filters):`);
  console.log(textFilter || 'NO TEXT FILTERS');
  
  return textFilter;
}

// Test the text filter construction
console.log('=== Testing Quote and Author ===');
debugTextFilter(
  'This is a test quote to verify text rendering',
  'Test Author',
  'Test Watermark',
  null
);

console.log('\n=== Testing Captions ===');
debugTextFilter(
  '',
  '',
  'Caption Test',
  [
    { text: 'First caption line', start: 0, duration: 3 },
    { text: 'Second caption appears here', start: 3, duration: 3 },
    { text: 'Final caption text', start: 6, duration: 4 }
  ]
);