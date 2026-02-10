"use client";

import { PageBackground } from "@/components/ad-studio/page-background";
import { SidebarForm } from "@/components/ad-studio/sidebar-form";
import { ResultPreview } from "@/components/ad-studio/result-preview";
import { LogsPanel } from "@/components/ad-studio/logs-panel";
import { useAdGeneration } from "@/components/ad-studio/use-ad-generation";

export default function Home() {
  const ad = useAdGeneration();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <PageBackground />

      <div className="relative flex h-screen overflow-hidden">
        <SidebarForm
          formStep={ad.formStep}
          goToStep={ad.goToStep}
          canProceed={ad.canProceed}
          totalSteps={ad.totalSteps}
          adType={ad.adType}
          setAdType={ad.setAdType}
          isLanding={ad.isLanding}
          image={ad.image}
          isDragging={ad.isDragging}
          fileInputRef={ad.fileInputRef}
          productFeatures={ad.productFeatures}
          setProductFeatures={ad.setProductFeatures}
          price={ad.price}
          setPrice={ad.setPrice}
          aspectRatio={ad.aspectRatio}
          setAspectRatio={ad.setAspectRatio}
          copyLanguage={ad.copyLanguage}
          setCopyLanguage={ad.setCopyLanguage}
          arabicDialect={ad.arabicDialect}
          setArabicDialect={ad.setArabicDialect}
          currency={ad.currency}
          setCurrency={ad.setCurrency}
          draftCopyOutput={ad.draftCopyOutput}
          setDraftCopyOutput={ad.setDraftCopyOutput}
          staticDraftCopyOutput={ad.staticDraftCopyOutput}
          setStaticDraftCopyOutput={ad.setStaticDraftCopyOutput}
          stage={ad.stage}
          error={ad.error}
          setError={ad.setError}
          isProcessing={ad.isProcessing}
          canRetry={ad.canRetry}
          onFileChange={ad.handleFileChange}
          onDrop={ad.handleDrop}
          onDragOver={ad.handleDragOver}
          onDragLeave={ad.handleDragLeave}
          onClearImage={ad.clearImage}
          onGenerateCopy={ad.handleGenerateCopy}
          onGenerateStaticCopy={ad.handleGenerateStaticCopy}
          onGenerate={ad.handleGenerate}
          onRetry={ad.handleRetry}
        />

        <ResultPreview
          result={ad.result}
          mergedImageUrl={ad.mergedImageUrl}
          setMergedImageUrl={ad.setMergedImageUrl}
          image={ad.image}
          isProcessing={ad.isProcessing}
          resultRef={ad.resultRef}
        />

        <LogsPanel
          promptLog={ad.promptLog}
          promptExpanded={ad.promptExpanded}
          setPromptExpanded={ad.setPromptExpanded}
          result={ad.result}
          promptLogRef={ad.promptLogRef}
          isLanding={ad.isLanding}
          draftCopyOutput={ad.draftCopyOutput}
        />
      </div>
    </div>
  );
}
