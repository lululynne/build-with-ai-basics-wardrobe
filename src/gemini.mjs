import {AppError,assert} from './domain.mjs';

export const MODEL = 'gemini-nano-banana-2.1';
export const PROMPT_VERSION = 'garment-catalog-v2';
export const GARMENT_PROMPT = `Use the attached image only as the source garment photograph. Draw exactly one clean, front-facing 2D fashion-catalog illustration of the SAME principal garment. Preserve its actual colors, shape, neckline, seams, sleeve and hem construction, proportions, stripe direction, visible button count, and garment details. Use fine clean dark outlines and restrained flat shading, like a detailed clothing-design sketch for a personal wardrobe collection. Center the garment at about 80 percent of the frame with clear margins on a plain warm-white background. Remove the mannequin or body, stand, hanger, background, and detached jewelry or chokers; do not draw floating accessories above or beside the garment. Preserve the garment's own attached straps, ties, bows, lace, and trims. Show only the garment, without a caption, card frame, or extra objects. Do not invent pockets, pocket flaps, decorative patterns, logos, buttons, lace, bows, or other construction details absent from the photograph. If the photograph does not clearly contain one garment, do not invent one. Return one final image.`;

export function imageType(bytes) {
  if(bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
  if(bytes.length>=24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if(bytes.length>=16 && bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP') return 'image/webp';
  return null;
}
export async function generateImage(source, {apiKey=process.env.GEMINI_API_KEY, fetcher=fetch}={}) {
  assert(apiKey && apiKey !== 'replace_with_your_own_key', '本机尚未配置 Gemini 凭据 / Gemini key is not configured',503);
  let response;
  try {
    response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{
      method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(180000),
      body:JSON.stringify({contents:[{role:'user',parts:[{text:GARMENT_PROMPT},{inlineData:{mimeType:source.mimeType,data:source.bytes.toString('base64')}}]}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:'1:1',imageSize:'1K'}}})
    });
  } catch { throw new AppError('生成连接中断或超时，未自动重试。可以主动重试或换照片 / Generation interrupted; retry explicitly or replace photo',502); }
  if(!response.ok) {
    const messages={429:'额度或请求频率受限 / Provider quota or rate limit',401:'Gemini 认证失败 / Provider authentication failed',403:'Gemini 访问受限 / Provider access denied'};
    throw new AppError(`${messages[response.status] ?? 'Gemini 暂时无法生成 / Provider could not generate'}。请主动重试或更换照片 / Retry explicitly or replace photo`,502);
  }
  let payload;
  try {payload=await response.json();} catch {throw new AppError('生成结果无法读取 / Invalid provider response',502);}
  for(const candidate of payload.candidates ?? []) for(const part of candidate.content?.parts ?? []) {
    if(part.thought) continue;
    const image=part.inlineData ?? part.inline_data;
    if(!image) continue;
    const bytes=Buffer.from(image.data ?? '', 'base64'); const mimeType=image.mimeType ?? image.mime_type;
    if(bytes.length>0 && bytes.length<=20*1024*1024 && imageType(bytes)===mimeType) return {bytes,mimeType,model:MODEL,promptVersion:PROMPT_VERSION};
  }
  throw new AppError('没有收到可用插画，请换清晰的单件衣物照片或主动重试 / No usable illustration; replace photo or retry explicitly',502);
}
