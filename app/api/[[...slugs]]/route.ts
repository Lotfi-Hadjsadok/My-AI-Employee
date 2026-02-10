import { Elysia, t } from "elysia";
import { createAd, createAdStream, createAdCopy, createAdStreamFromCopy, createAdCopyStream } from "@/app/controllers/ad.controller";
import {
  createLandingAd,
  createLandingAdStream,
  createLandingAdCopy,
  createLandingAdRetry,
  createLandingAdCopyStream,
} from "@/app/controllers/landing-ad.controller";
import { mergeLandingSections } from "@/app/controllers/landing-merge.controller";
import { getImageProxy } from "@/app/controllers/image-proxy.controller";
import { createReplicate } from "@/app/controllers/replicate.controller";

export const runtime = "nodejs";
export const maxDuration = 300;

const app = new Elysia({ prefix: "/api" })
  // POST /api/ad
  .post("/ad", ({ request }) => createAd(request))
  // POST /api/ad/copy - copy + features only for static ad (user edits then calls stream-from-copy)
  .post("/ad/copy", ({ request }) => createAdCopy(request))
  // POST /api/ad/copy-stream - streaming copy + features for static ad
  .post("/ad/copy-stream", ({ request }) => createAdCopyStream(request))
  // POST /api/ad/stream-from-copy - creative + image using provided copyOutput
  .post("/ad/stream-from-copy", ({ request }) => createAdStreamFromCopy(request))
  // POST /api/ad/stream
  .post("/ad/stream", ({ request }) => createAdStream(request))
  // POST /api/landing-ad
  .post("/landing-ad", ({ request }) => createLandingAd(request))
  // POST /api/landing-ad/stream
  .post("/landing-ad/stream", ({ request }) => createLandingAdStream(request))
  // POST /api/landing-ad/copy - copy + features only for review/edit
  .post("/landing-ad/copy", ({ request }) => createLandingAdCopy(request))
  // POST /api/landing-ad/copy-stream - streaming copy + features for review/edit
  .post("/landing-ad/copy-stream", ({ request }) => createLandingAdCopyStream(request))
  // POST /api/landing-ad/retry - resume from image step when partial state exists
  .post("/landing-ad/retry", ({ request }) => createLandingAdRetry(request))
  // POST /api/landing-ad/merge - merge 2 images into full landing page
  .post("/landing-ad/merge", ({ request }) => mergeLandingSections(request))
  // GET /api/image-proxy?url=...
  .get("/image-proxy", ({ query }) => getImageProxy(query.url), {
    query: t.Object({ url: t.String() }),
  })
  // POST /api/replicate
  .post(
    "/replicate",
    ({ body }) => createReplicate(body),
    {
      body: t.Object({
        prompt: t.String(),
        model: t.Optional(t.String()),
        input: t.Optional(t.Any()),
      }),
    }
  );

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
