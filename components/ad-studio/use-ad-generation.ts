"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AdResult, PipelineStage, PromptLogEntry, DraftCopyOutput, StaticDraftCopyOutput } from "./types";
import { processFile } from "./utils";

export type AdType = "static" | "landing" | null;

export function useAdGeneration() {
  const [formStep, setFormStep] = useState(1);
  const [adType, setAdType] = useState<AdType>(null);
  const [image, setImage] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("");
  const [productFeatures, setProductFeatures] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [copyLanguage, setCopyLanguage] = useState<string>("en");
  const [arabicDialect, setArabicDialect] = useState<string>("algerian");
  const [currency, setCurrency] = useState<string>("USD");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [result, setResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergedImageUrl, setMergedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [promptLog, setPromptLog] = useState<PromptLogEntry[]>([]);
  const [promptExpanded, setPromptExpanded] = useState<string | null>(null);
  const [draftCopyOutput, setDraftCopyOutput] = useState<DraftCopyOutput | null>(null);
  const [staticDraftCopyOutput, setStaticDraftCopyOutput] = useState<StaticDraftCopyOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const promptLogRef = useRef<HTMLDivElement>(null);

  const isLanding = adType === "landing";
  const totalSteps = adType === null ? 1 : isLanding ? 7 : 9;

  useEffect(() => {
    if (adType === "landing" && formStep > 7) setFormStep(2);
    if (adType === "static" && formStep > 9) setFormStep(2);
    if (adType === "static" && draftCopyOutput) setDraftCopyOutput(null);
    if (adType === "landing" && staticDraftCopyOutput) setStaticDraftCopyOutput(null);
  }, [adType]);

  useEffect(() => {
    if (isLanding && formStep >= 3 && formStep <= 6 && !draftCopyOutput) setFormStep(2);
  }, [isLanding, formStep, draftCopyOutput]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, setImage, setError, setResult);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file, setImage, setError, setResult);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setResult(null);
    setError(null);
    setStage("idle");
    setFormStep(1);
    setAdType(null);
    setMergedImageUrl(null);
    setDraftCopyOutput(null);
    setStaticDraftCopyOutput(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const goToStep = useCallback((step: number) => setFormStep(step), []);

  const canProceed = useCallback(() => {
    if (formStep === 1) return adType !== null;
    if (!isLanding && formStep === 2) return true; // format step
    if (!isLanding && formStep === 4) return !!image;
    if (!isLanding && formStep >= 5 && formStep <= 8) return !!staticDraftCopyOutput;
    if (isLanding && formStep === 3) return !!draftCopyOutput?.headline?.trim();
    if (isLanding && formStep === 6) return !!draftCopyOutput?.cta?.trim();
    return true;
  }, [formStep, image, isLanding, draftCopyOutput, staticDraftCopyOutput, adType]);

  const handleGenerateCopy = useCallback(async () => {
    if (!image || adType !== "landing") return;
    setStage("copy");
    setError(null);
    setDraftCopyOutput(null);
    setPromptLog([]);
    setPromptExpanded(null);
    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      if (price.trim()) formData.append("price", price.trim());
      if (productFeatures.trim()) formData.append("productFeatures", productFeatures.trim());
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);
      formData.append("currency", currency);

      const res = await fetch("/api/landing-ad/copy-stream", { method: "POST", body: formData });
      if (!res.ok || !res.body) {
        throw new Error("Copy generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim()) as {
              stage?: string;
              prompt?: string;
              promptLabel?: string;
              output?: string;
              copyOutput?: DraftCopyOutput | null;
              error?: string;
            };

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.stage && data.stage !== "done") {
              const s = data.stage;
              // For copy-only landing flow, treat all stages as "copy" for UX
              setStage("copy");

              if (data.prompt && data.promptLabel) {
                setPromptLog((prev) => [
                  ...prev,
                  { step: s, label: data.promptLabel ?? "", prompt: data.prompt, output: data.output },
                ]);
                setTimeout(
                  () => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
                  50
                );
              }

              if (data.output && !data.prompt) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const i = next.findLastIndex((e) => e.step === s);
                  if (i >= 0) next[i] = { ...next[i], output: data.output };
                  return next;
                });
                setTimeout(
                  () => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
                  50
                );
              }
            }

            if (data.stage === "done" && data.copyOutput) {
              const raw = data.copyOutput;
              const normalized: DraftCopyOutput = {
                headline: raw?.headline ?? "",
                subheadline: raw?.subheadline ?? "",
                cta: raw?.cta ?? "",
                tag: raw?.tag,
                badge_text: raw?.badge_text ?? null,
                badges: Array.isArray(raw?.badges) ? raw.badges : raw?.badge_text ? [raw.badge_text] : [],
                price: raw?.price ?? "",
                section3Headline: raw?.section3Headline ?? "",
                section3Subheadline: raw?.section3Subheadline ?? "",
                shop_info: raw?.shop_info ?? null,
                features: Array.isArray(raw?.features) ? raw.features : [],
              };
              setDraftCopyOutput(normalized);
              setStage("idle");
              setFormStep(3);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") {
              throw e;
            }
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim()) as {
            stage?: string;
            copyOutput?: DraftCopyOutput | null;
            error?: string;
          };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.stage === "done" && data.copyOutput) {
            const raw = data.copyOutput;
            const normalized: DraftCopyOutput = {
              headline: raw?.headline ?? "",
              subheadline: raw?.subheadline ?? "",
              cta: raw?.cta ?? "",
              tag: raw?.tag,
              badge_text: raw?.badge_text ?? null,
              badges: Array.isArray(raw?.badges) ? raw.badges : raw?.badge_text ? [raw.badge_text] : [],
              price: raw?.price ?? "",
              section3Headline: raw?.section3Headline ?? "",
              section3Subheadline: raw?.section3Subheadline ?? "",
              shop_info: raw?.shop_info ?? null,
              features: Array.isArray(raw?.features) ? raw.features : [],
            };
            setDraftCopyOutput(normalized);
            setStage("idle");
            setFormStep(3);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") {
            throw e;
          }
        }
      }
    } catch (err: unknown) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Copy generation failed");
    }
  }, [image, price, productFeatures, copyLanguage, arabicDialect, adType]);

  const handleGenerateStaticCopy = useCallback(async () => {
    if (!image || adType !== "static") return;
    setStage("copy");
    setError(null);
    setStaticDraftCopyOutput(null);
    setPromptLog([]);
    setPromptExpanded(null);
    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      if (price.trim()) formData.append("price", price.trim());
      if (productFeatures.trim()) formData.append("productFeatures", productFeatures.trim());
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);

      const res = await fetch("/api/ad/copy-stream", { method: "POST", body: formData });
      if (!res.ok || !res.body) {
        throw new Error("Copy generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim()) as {
              stage?: string;
              prompt?: string;
              promptLabel?: string;
              output?: string;
              copyOutput?: StaticDraftCopyOutput | null;
              error?: string;
            };

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.stage && data.stage !== "done") {
              const s = data.stage;
              setStage("copy");

              if (data.promptLabel && (data.output !== undefined || data.prompt)) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const i = next.findLastIndex((e) => e.step === s && e.label === data.promptLabel);
                  if (i >= 0) {
                    next[i] = { ...next[i], output: data.output };
                    return next;
                  }
                  return [
                    ...prev,
                    {
                      step: s,
                      label: data.promptLabel ?? "",
                      prompt: data.prompt ?? "",
                      output: data.output,
                    },
                  ];
                });
                setTimeout(
                  () => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
                  50
                );
              }
            }

            if (data.stage === "done" && data.copyOutput) {
              const raw = data.copyOutput;
              const normalized: StaticDraftCopyOutput = {
                headline: raw?.headline ?? "",
                subheadline: raw?.subheadline ?? "",
                cta: raw?.cta ?? "",
                badge_text: raw?.badge_text ?? null,
                badges: Array.isArray(raw?.badges) ? raw.badges : raw?.badge_text ? [raw.badge_text] : [],
                price: raw?.price ?? undefined,
                additional_text: Array.isArray(raw?.additional_text) ? raw.additional_text : null,
                features: Array.isArray(raw?.features) ? raw.features : undefined,
              };
              setStaticDraftCopyOutput(normalized);
              setStage("idle");
              setFormStep(5);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") {
              throw e;
            }
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim()) as {
            stage?: string;
            copyOutput?: StaticDraftCopyOutput | null;
            error?: string;
          };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.stage === "done" && data.copyOutput) {
            const raw = data.copyOutput;
            const normalized: StaticDraftCopyOutput = {
              headline: raw?.headline ?? "",
              subheadline: raw?.subheadline ?? "",
              cta: raw?.cta ?? "",
              badge_text: raw?.badge_text ?? null,
              badges: Array.isArray(raw?.badges) ? raw.badges : raw?.badge_text ? [raw.badge_text] : [],
              price: raw?.price ?? undefined,
              additional_text: Array.isArray(raw?.additional_text) ? raw.additional_text : null,
              features: Array.isArray(raw?.features) ? raw.features : undefined,
            };
            setStaticDraftCopyOutput(normalized);
            setStage("idle");
            setFormStep(5);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") {
            throw e;
          }
        }
      }
    } catch (err: unknown) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Copy generation failed");
    }
  }, [image, price, productFeatures, copyLanguage, arabicDialect, adType]);

  const handleGenerate = useCallback(async () => {
    if (!image) return;
    const isLandingFlow = adType === "landing";
    const isStaticWithDraft = adType === "static" && staticDraftCopyOutput;
    if (isLandingFlow && formStep === 7 && draftCopyOutput) {
      setStage("creative");
      setError(null);
      setResult(null);
      setMergedImageUrl(null);
      setPromptLog([]);
      setPromptExpanded(null);
      try {
        const formData = new FormData();
        const blob = await (await fetch(image)).blob();
        formData.append("image", blob, "product.jpg");
        const landingCopy = { ...draftCopyOutput, badge_text: draftCopyOutput.badges?.[0] ?? draftCopyOutput.badge_text ?? null };
        formData.append("copyOutput", JSON.stringify(landingCopy));
        formData.append("copyLanguage", copyLanguage);
        if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);
        formData.append("currency", currency);
        const response = await fetch("/api/landing-ad/retry", { method: "POST", body: formData });
        if (!response.ok || !response.body) throw new Error("Request failed");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const idx = event.indexOf("data: ");
            if (idx === -1) continue;
            try {
              const data = JSON.parse(event.slice(idx + 6).trim());
              if (data.stage && data.stage !== "done") {
                if (["image"].includes(data.stage)) setStage("generating");
                else setStage(data.stage);
                if (data.prompt && data.promptLabel) {
                  setPromptLog((prev) => [...prev, { step: data.stage, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
                  setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
                }
                if (data.output && !data.prompt) {
                  setPromptLog((prev) => {
                    const next = [...prev];
                    const i = next.findLastIndex((e) => e.step === data.stage);
                    if (i >= 0) next[i] = { ...next[i], output: data.output };
                    return next;
                  });
                  setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
                }
              }
              if (data.stage === "done" && data.result) {
                setStage("done");
                setResult(data.result);
                resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              if (e instanceof Error && e.message !== "Request failed") throw e;
            }
          }
        }
        for (const event of buffer.split("\n\n").filter(Boolean)) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      } catch (err: unknown) {
        setStage("error");
        setError(err instanceof Error ? err.message : "Generation failed");
      }
      return;
    }
    if (isStaticWithDraft) {
      setStage("creative");
      setError(null);
      setResult(null);
      setMergedImageUrl(null);
      setPromptLog([]);
      setPromptExpanded(null);
      try {
        const formData = new FormData();
        const blob = await (await fetch(image)).blob();
        formData.append("image", blob, "product.jpg");
        const staticCopy = { ...staticDraftCopyOutput, badge_text: staticDraftCopyOutput.badges?.[0] ?? staticDraftCopyOutput.badge_text ?? null };
        formData.append("copyOutput", JSON.stringify(staticCopy));
        formData.append("aspectRatio", aspectRatio);
        const response = await fetch("/api/ad/stream-from-copy", { method: "POST", body: formData });
        if (!response.ok || !response.body) throw new Error("Request failed");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const idx = event.indexOf("data: ");
            if (idx === -1) continue;
            try {
              const data = JSON.parse(event.slice(idx + 6).trim());
              if (data.stage && data.stage !== "done") {
                if (["creative"].includes(data.stage)) setStage("creative");
                else if (["image", "generating"].includes(data.stage)) setStage("generating");
                else setStage(data.stage);
                if (data.promptLabel && (data.output !== undefined || data.prompt)) {
                  setPromptLog((prev) => {
                    const next = [...prev];
                    const i = next.findLastIndex((e) => e.step === data.stage && e.label === data.promptLabel);
                    if (i >= 0) {
                      next[i] = { ...next[i], output: data.output };
                      return next;
                    }
                    return [...prev, { step: data.stage, label: data.promptLabel ?? "", prompt: data.prompt ?? "", output: data.output }];
                  });
                  setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
                }
                resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              if (data.stage === "done" && data.result) {
                setStage("done");
                setResult(data.result);
                resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              if (e instanceof Error && e.message !== "Request failed") throw e;
            }
          }
        }
        for (const event of buffer.split("\n\n").filter(Boolean)) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      } catch (err: unknown) {
        setStage("error");
        setError(err instanceof Error ? err.message : "Image generation failed");
      }
      return;
    }
    setStage("copy");
    setError(null);
    setResult(null);
    setMergedImageUrl(null);
    setPromptLog([]);
    setPromptExpanded(null);

    const apiUrl = isLandingFlow ? "/api/landing-ad/stream" : "/api/ad/stream";

    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      if (price.trim()) formData.append("price", price.trim());
      if (productFeatures.trim()) formData.append("productFeatures", productFeatures.trim());
      if (!isLandingFlow) formData.append("aspectRatio", aspectRatio);
      formData.append("currency", currency);
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage && data.stage !== "done") {
              const s = data.stage;
              if (["copy", "features"].includes(s)) setStage("copy");
              else if (["creative", "creative1", "creative2", "creative3"].includes(s)) setStage("creative");
              else if (["image", "generating"].includes(s)) setStage("generating");
              else setStage(s);
              if (data.prompt && data.promptLabel && isLanding) {
                setPromptLog((prev) => [...prev, { step: s, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              if (data.promptLabel && (data.output !== undefined || data.prompt) && !isLanding) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const i = next.findLastIndex((e) => e.step === s && e.label === data.promptLabel);
                  if (i >= 0) {
                    next[i] = { ...next[i], output: data.output };
                    return next;
                  }
                  return [...prev, { step: s, label: data.promptLabel, prompt: data.prompt ?? "", output: data.output }];
                });
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              if (data.output && !data.prompt && isLanding) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const i = next.findLastIndex((e) => e.step === s);
                  if (i >= 0) next[i] = { ...next[i], output: data.output };
                  return next;
                });
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim());
          if (data.stage && data.stage !== "done") {
            const s = data.stage;
            if (["copy", "features"].includes(s)) setStage("copy");
            else if (["creative", "creative1", "creative2", "creative3"].includes(s)) setStage("creative");
            else if (["image", "generating"].includes(s)) setStage("generating");
            else setStage(s);
            if (data.prompt && data.promptLabel && isLanding) {
              setPromptLog((prev) => [...prev, { step: s, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
            }
            if (data.promptLabel && (data.output !== undefined || data.prompt) && !isLanding) {
              setPromptLog((prev) => {
                const next = [...prev];
                const i = next.findLastIndex((e) => e.step === s && e.label === data.promptLabel);
                if (i >= 0) {
                  next[i] = { ...next[i], output: data.output };
                  return next;
                }
                return [...prev, { step: s, label: data.promptLabel, prompt: data.prompt ?? "", output: data.output }];
              });
            }
            if (data.output && !data.prompt && isLanding) {
              setPromptLog((prev) => {
                const next = [...prev];
                const i = next.findLastIndex((e) => e.step === s);
                if (i >= 0) next[i] = { ...next[i], output: data.output };
                return next;
              });
            }
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.stage === "done" && data.result) {
            setStage("done");
            setResult(data.result);
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.error) throw new Error(data.error);
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") throw e;
        }
      }
    } catch (err: unknown) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [image, aspectRatio, price, productFeatures, copyLanguage, arabicDialect, formStep, draftCopyOutput, staticDraftCopyOutput, adType]);

  const canRetry =
    adType === "landing" &&
    stage === "error" &&
    !!image &&
    !!result?.copyOutput;

  const handleRetry = useCallback(async () => {
    if (!canRetry || !image || !result?.copyOutput) return;
    setStage("generating");
    setError(null);
    setPromptLog([]);

    try {
      const formData = new FormData();
      const blob = await (await fetch(image)).blob();
      formData.append("image", blob, "product.jpg");
      formData.append("copyOutput", JSON.stringify(result.copyOutput));
      formData.append("copyLanguage", copyLanguage);
      if (copyLanguage === "ar") formData.append("arabicDialect", arabicDialect);
      formData.append("currency", currency);

      const response = await fetch("/api/landing-ad/retry", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const idx = event.indexOf("data: ");
          if (idx === -1) continue;
          try {
            const data = JSON.parse(event.slice(idx + 6).trim());
            if (data.stage && data.stage !== "done") {
              if (["image"].includes(data.stage)) setStage("generating");
              else setStage(data.stage);
              if (data.prompt && data.promptLabel) {
                setPromptLog((prev) => [...prev, { step: data.stage, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
              if (data.output && !data.prompt) {
                setPromptLog((prev) => {
                  const next = [...prev];
                  const i = next.findLastIndex((e) => e.step === data.stage);
                  if (i >= 0) next[i] = { ...next[i], output: data.output };
                  return next;
                });
                setTimeout(() => promptLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
              }
            }
            if (data.stage === "done" && data.result) {
              setStage("done");
              setResult(data.result);
              setError(null);
              resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (e instanceof Error && e.message !== "Request failed") throw e;
          }
        }
      }

      for (const event of buffer.split("\n\n").filter(Boolean)) {
        const idx = event.indexOf("data: ");
        if (idx === -1) continue;
        try {
          const data = JSON.parse(event.slice(idx + 6).trim());
          if (data.stage && data.stage !== "done" && data.prompt && data.promptLabel) {
            setPromptLog((prev) => [...prev, { step: data.stage, label: data.promptLabel, prompt: data.prompt, output: data.output }]);
          }
          if (data.stage && data.stage !== "done" && data.output && !data.prompt) {
            setPromptLog((prev) => {
              const next = [...prev];
              const i = next.findLastIndex((e) => e.step === data.stage);
              if (i >= 0) next[i] = { ...next[i], output: data.output };
              return next;
            });
          }
          if (data.stage === "done" && data.result) {
            setStage("done");
            setResult(data.result);
            setError(null);
            resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          if (data.error) throw new Error(data.error);
        } catch (e) {
          if (e instanceof Error && e.message !== "Request failed") throw e;
        }
      }
    } catch (err: unknown) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }, [canRetry, image, result?.copyOutput, price, copyLanguage, arabicDialect]);

  const isProcessing = stage !== "idle" && stage !== "done" && stage !== "error";

  useEffect(() => {
    if (promptLog.length > 0) {
      const last = promptLog[promptLog.length - 1];
      setPromptExpanded(`${last.step}-${promptLog.length - 1}`);
    }
  }, [promptLog.length]);

  return {
    formStep,
    goToStep,
    canProceed,
    totalSteps,
    adType,
    setAdType,
    isLanding,
    image,
    isDragging,
    fileInputRef,
    productFeatures,
    setProductFeatures,
    price,
    setPrice,
    aspectRatio,
    setAspectRatio,
    copyLanguage,
    setCopyLanguage,
    arabicDialect,
    setArabicDialect,
    currency,
    setCurrency,
    draftCopyOutput,
    setDraftCopyOutput,
    staticDraftCopyOutput,
    setStaticDraftCopyOutput,
    stage,
    result,
    error,
    setError,
    mergedImageUrl,
    setMergedImageUrl,
    promptLog,
    promptExpanded,
    setPromptExpanded,
    promptLogRef,
    resultRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearImage,
    handleGenerateCopy,
    handleGenerateStaticCopy,
    handleGenerate,
    handleRetry,
    canRetry,
    isProcessing,
  };
}
