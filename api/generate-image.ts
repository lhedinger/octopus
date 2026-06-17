/**
 * Optional AI art proxy (serverless function, e.g. Vercel/Netlify style).
 *
 * The frontend stays a static site and works fully on procedural art alone.
 * Deploy this only when you want AI-generated images for microservices, and
 * point the app at it with `VITE_AI_IMAGE_URL=/api/generate-image`.
 *
 * The image-provider API key lives here, server-side, and is NEVER shipped to
 * the browser. The provider below is a stub — wire in your chosen text-to-image
 * model (OpenAI Images, Stability, etc.) where indicated.
 */

interface GenerateRequest {
  kind: string;
  name: string;
  description?: string;
}

function buildPrompt(req: GenerateRequest): string {
  const subject = req.description?.trim() || req.name;
  return [
    `Isometric 3D game-asset icon of a software ${req.kind} called "${req.name}".`,
    subject ? `It is responsible for: ${subject}.` : '',
    'Clean low-poly style, soft studio lighting, transparent background, centered, no text.',
  ]
    .filter(Boolean)
    .join(' ');
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.IMAGE_API_KEY;
  if (!apiKey) {
    // No key configured: tell the client to fall back to procedural art.
    return new Response(JSON.stringify({ image: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const prompt = buildPrompt(body);

  // TODO: call your image provider with `prompt` and `apiKey`, then return a
  // data URL or hosted URL as `image`. Example shape of the expected response:
  //
  //   const image = await callImageProvider(prompt, apiKey);
  //   return Response.json({ image });
  //
  // Until wired up, return null so the client keeps the procedural art.
  void prompt;
  return new Response(JSON.stringify({ image: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
