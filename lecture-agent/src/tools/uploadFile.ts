// src/tools/uploadFile.ts
export async function uploadFile(ctx: any) {
  // Handle multipart file upload
  const { files } = ctx.request;
  
  if (!files || !files.video) {
    throw new Error('No video file provided');
  }
  
  const videoFile = files.video;
  const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the uploaded file in object storage
  await ctx.object.put(`uploads/${fileId}.mp4`, videoFile.buffer);
  
  return {
    fileId,
    originalName: videoFile.originalname,
    size: videoFile.size,
    mimeType: videoFile.mimetype
  };
}