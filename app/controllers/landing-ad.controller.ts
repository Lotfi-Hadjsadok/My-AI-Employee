import {
  runLandingPipeline,
  runLandingPipelineWithProgress,
  runLandingPipelineResume,
} from "@/lib/landing-ad";
import type { CopyLanguage, ArabicDialect } from "@/lib/landing-ad";
import { bufferToDataUrl } from "@/lib/openrouter";

export async function createLandingAd(request: Request) {
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
    const copyLanguage = ((formData.get("copyLanguage") as string) || "en") as CopyLanguage;
    const arabicDialect = (formData.get("arabicDialect") as string) || undefined;
    const productFeatures = (formData.get("productFeatures") as string)?.trim() || undefined;

    const result = await runLandingPipeline(imageUrl, {
      price,
      copyLanguage: ["en", "fr", "ar"].includes(copyLanguage) ? copyLanguage : "en",
      arabicDialect: arabicDialect && ["algerian", "tunisian", "moroccan"].includes(arabicDialect)
        ? (arabicDialect as ArabicDialect)
        : undefined,
      productFeatures,
    });

    return {
      success: true,
      inputImage: imageUrl,
      copyOutput: result.copyOutput,
      imageUrl: result.imageUrl, // Single Canva image with all three sections (700x1632px)
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Landing ad pipeline error:", error);
    return new Response(
      JSON.stringify({ error: err?.message || "Landing page generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function createLandingAdStream(request: Request) {
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

        const result = await runLandingPipelineWithProgress(
          imageUrl,
          (stage, partial) => send({ stage, ...partial }),
          { price, copyLanguage, arabicDialect, productFeatures }
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
            imageUrl: result.imageUrl, // Single Canva image with all three sections (700x1632px)
          },
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        send({ error: err?.message || "Landing page generation failed" });
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

export async function createLandingAdRetry(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const formData = await request.formData();
        const file = formData.get("image") as File;
        const copyOutputRaw = formData.get("copyOutput") as string;
        const price = (formData.get("price") as string)?.trim() || undefined;
        const rawLang = (formData.get("copyLanguage") as string) || "en";
        const copyLanguage = (["en", "fr", "ar"].includes(rawLang) ? rawLang : "en") as CopyLanguage;
        const rawDialect = (formData.get("arabicDialect") as string) || undefined;
        const arabicDialect =
          rawDialect && ["algerian", "tunisian", "moroccan"].includes(rawDialect)
            ? (rawDialect as ArabicDialect)
            : undefined;

        if (!file || !copyOutputRaw) {
          send({ error: "Retry requires image and copyOutput" });
          controller.close();
          return;
        }

        let copyOutput: Parameters<typeof runLandingPipelineResume>[0]["copyOutput"];
        try {
          copyOutput = JSON.parse(copyOutputRaw) as typeof copyOutput;
        } catch {
          send({ error: "Invalid copyOutput JSON" });
          controller.close();
          return;
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imageUrl = bufferToDataUrl(buffer, file.type.startsWith("image/") ? file.type : "image/jpeg");

        const result = await runLandingPipelineResume(
          { inputImage: imageUrl, copyOutput, price, copyLanguage, arabicDialect },
          (stage, partial) => send({ stage, ...partial })
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
            imageUrl: result.imageUrl, // Single Canva image with all three sections (700x1632px)
          },
        });
      } catch (error: unknown) {
        const err = error as { message?: string };
        send({ error: err?.message || "Retry failed" });
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
