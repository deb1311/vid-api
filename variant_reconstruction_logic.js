// Variant Reconstruction Logic for Set Node
// This reconstructs the full JSON variants from the minimal assets

const baseJson = $node["Video Analysis Agent"].json;
const variantAssets = $node["Minimal Variant Generator"].json;

// Reconstruct full variants
const variants = variantAssets.map((assets, index) => {
  // Deep clone the base JSON
  const variant = JSON.parse(JSON.stringify(baseJson));
  
  // Update watermark
  variant.request_json.watermark = assets.username;
  
  // Update clip assets
  if (variant.request_json.clips && assets.clipAssets) {
    variant.request_json.clips.forEach((clip, clipIndex) => {
      if (assets.clipAssets[clipIndex]) {
        clip.videoUrl = assets.clipAssets[clipIndex].videoUrl;
        clip.description = assets.clipAssets[clipIndex].description;
      }
    });
  }
  
  // Update caption alts
  if (variant.request_json.captions && assets.captionAlts) {
    variant.request_json.captions.forEach((caption, captionIndex) => {
      if (assets.captionAlts[captionIndex]) {
        caption.alt = assets.captionAlts[captionIndex].alt;
      }
    });
  }
  
  // Update main caption if provided
  if (assets.captionVariant) {
    variant.caption = assets.captionVariant;
  }
  
  return variant;
});

return variants;