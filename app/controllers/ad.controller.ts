import {
  runAdPipeline,
  runAdPipelineWithProgress,
  runCopyOnly,
  runCreativeAndImageWithProgress,
  type CopyOutput,
} from "@/lib/static-ad";
import type { AspectRatio, CopyLanguage, ArabicDialect } from "@/lib/static-ad";
import { bufferToDataUrl } from "@/lib/openrouter";

export async function createAd(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Image file is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");

    const price = (formData.get("price") as string)?.trim() || undefined;
    const aspectRatio = ((formData.get("aspectRatio") as string) || "1:1") as AspectRatio;

    const result = await runAdPipeline(imageUrl, {
      price,
      aspectRatio: ["1:1", "4:5", "9:16", "16:9"].includes(aspectRatio) ? aspectRatio : "1:1",
    });

    return {
      success: true,
      inputImage: imageUrl,
      copyOutput: result.copyOutput,
      creativeOutput: result.creativeOutput,
      generatedImageUrl: result.generatedImageUrl,
      refinedImageUrl: result.refinedImageUrl,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Ad pipeline error:", error);
    return new Response(
      JSON.stringify({ error: err?.message || "Ad generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function createAdCopy(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    if (!file) {
      return new Response(
        JSON.stringify({ error: "Image file is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");
    const price = (formData.get("price") as string)?.trim() || undefined;
    const rawLang = (formData.get("copyLanguage") as string) || "en";
    const copyLanguage = (["en", "fr", "ar"].includes(rawLang) ? rawLang : "en") as CopyLanguage;
    const rawDialect = (formData.get("arabicDialect") as string) || undefined;
    const arabicDialect =
      rawDialect && ["algerian", "tunisian", "moroccan"].includes(rawDialect)
        ? (rawDialect as ArabicDialect)
        : undefined;
    const productFeatures = (formData.get("productFeatures") as string)?.trim() || undefined;

    const logs: { step: string; label: string; prompt: string; output?: string }[] = [];

    const result = await runCopyOnly(
      imageUrl,
      {
        price,
        copyLanguage,
        arabicDialect,
        productFeatures,
      },
      (stage, detail) => {
        if (!detail) return;
        const label = detail.promptLabel ?? "Copy agent";
        if (detail.prompt) {
          logs.push({
            step: stage,
            label,
            prompt: detail.prompt,
            output: detail.output,
          });
        } else if (detail.output) {
          const idx = logs
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => e.step === stage && e.label === label)
            .map(({ i }) => i)
            .pop();
          if (idx != null) {
            logs[idx] = { ...logs[idx], output: detail.output };
          }
        }
      }
    );
    const copyWithPrice = result.copyOutput
      ? { ...result.copyOutput, price: result.copyOutput.price || price || undefined }
      : result.copyOutput;
    return new Response(JSON.stringify({ copyOutput: copyWithPrice, logs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Ad copy error:", error);
    return new Response(
      JSON.stringify({ error: err?.message || "Copy generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function createAdCopyStream(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const formData = await request.formData();
        const file = formData.get("image") as File;

        if (!file) {
          send({ error: "Image file is required" });
          controller.close();
          return;
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");

        const price = (formData.get("price") as string)?.trim() || undefined;
        const rawLang = (formData.get("copyLanguage") as string) || "en";
        const copyLanguage = (["en", "fr", "ar"].includes(rawLang) ? rawLang : "en") as CopyLanguage;
        const rawDialect = (formData.get("arabicDialect") as string) || undefined;
        const arabicDialect =
          rawDialect && ["algerian", "tunisian", "moroccan"].includes(rawDialect)
            ? (rawDialect as ArabicDialect)
            : undefined;
        const productFeatures = (formData.get("productFeatures") as string)?.trim() || undefined;

        const result = await runCopyOnly(
          imageUrl,
          {
            price,
            copyLanguage,
            arabicDialect,
            productFeatures,
          },
          (stage, detail) => {
            if (!detail) return;
            send({ stage, ...detail });
          }
        );

        const copyWithPrice = result.copyOutput
          ? { ...result.copyOutput, price: result.copyOutput.price || price || undefined }
          : result.copyOutput;

        send({
          stage: "done",
          copyOutput: copyWithPrice,
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        send({ error: err?.message || "Copy generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function createAdStreamFromCopy(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const formData = await request.formData();
        const file = formData.get("image") as File;
        if (!file) {
          send({ error: "Image file is required" });
          controller.close();
          return;
        }
        const copyOutputRaw = formData.get("copyOutput") as string;
        if (!copyOutputRaw) {
          send({ error: "copyOutput is required" });
          controller.close();
          return;
        }
        let copyOutput: CopyOutput;
        try {
          copyOutput = JSON.parse(copyOutputRaw) as CopyOutput;
        } catch {
          send({ error: "Invalid copyOutput JSON" });
          controller.close();
          return;
        }
        if (!copyOutput.headline || !copyOutput.cta) {
          send({ error: "copyOutput must include headline and cta" });
          controller.close();
          return;
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");
        const price = (formData.get("price") as string)?.trim() || undefined;
        const rawAspect = (formData.get("aspectRatio") as string) || "1:1";
        const aspectRatio = (["1:1", "4:5", "9:16", "16:9"].includes(rawAspect) ? rawAspect : "1:1") as AspectRatio;

        const result = await runCreativeAndImageWithProgress(
          imageUrl,
          copyOutput,
          (stage, detail) => send({ stage, ...detail }),
          { price, aspectRatio }
        );
        const copyWithPrice = result.copyOutput
          ? { ...result.copyOutput, price: result.copyOutput.price || price || undefined }
          : result.copyOutput;
        send({
          stage: "done",
          result: {
            success: true,
            inputImage: imageUrl,
            copyOutput: copyWithPrice,
            creativeOutput: result.creativeOutput,
            generatedImageUrl: result.generatedImageUrl,
            refinedImageUrl: result.refinedImageUrl,
          },
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        send({ error: err?.message || "Image generation failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function createAdStream(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const formData = await request.formData();
        const file = formData.get("image") as File;

        if (!file) {
          send({ error: "Image file is required" });
          controller.close();
          return;
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");

        const price = (formData.get("price") as string)?.trim() || undefined;
        const rawAspect = (formData.get("aspectRatio") as string) || "1:1";
        const aspectRatio = (["1:1", "4:5", "9:16", "16:9"].includes(rawAspect) ? rawAspect : "1:1") as AspectRatio;
        const rawLang = (formData.get("copyLanguage") as string) || "en";
        const copyLanguage = (["en", "fr", "ar"].includes(rawLang) ? rawLang : "en") as CopyLanguage;
        const rawDialect = (formData.get("arabicDialect") as string) || undefined;
        const arabicDialect =
          rawDialect && ["algerian", "tunisian", "moroccan"].includes(rawDialect)
            ? (rawDialect as ArabicDialect)
            : undefined;
        const productFeatures = (formData.get("productFeatures") as string)?.trim() || undefined;

        const result = await runAdPipelineWithProgress(
          imageUrl,
          (stage, detail) => send({ stage, ...detail }),
          { price, aspectRatio, copyLanguage, arabicDialect, productFeatures }
        );

        const copyWithPrice = result.copyOutput
          ? {
              ...result.copyOutput,
              price: result.copyOutput.price || price || undefined,
              features: result.copyOutput.features,
            }
          : result.copyOutput;

        send({
          stage: "done",
          result: {
            success: true,
            inputImage: imageUrl,
            copyOutput: copyWithPrice,
            creativeOutput: result.creativeOutput,
            generatedImageUrl: result.generatedImageUrl,
            refinedImageUrl: result.refinedImageUrl,
          },
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        send({ error: err?.message || "Ad generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
