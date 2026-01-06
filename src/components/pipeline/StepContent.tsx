'use client';

import type { Project, PipelineStepId } from '@/types/pipeline';
import { ContentIdeaStep } from './steps/ContentIdeaStep';
import { ScriptStep } from './steps/ScriptStep';
import { SegmentsStep } from './steps/SegmentsStep';
import { ImagePromptsStep } from './steps/ImagePromptsStep';
import { ImagesStep } from './steps/ImagesStep';
import { VideosStep } from './steps/VideosStep';
import { CompositionStep } from './steps/CompositionStep';
import { ThumbnailStep } from './steps/ThumbnailStep';
import { DistributionStep } from './steps/DistributionStep';

interface StepContentProps {
  stepId: PipelineStepId;
  project: Project;
}

export function StepContent({ stepId, project }: StepContentProps) {
  switch (stepId) {
    case 'content_idea':
      return <ContentIdeaStep project={project} step={project.contentIdea} />;
    case 'script_generation':
      return <ScriptStep project={project} step={project.scriptGeneration} />;
    case 'segments':
      return <SegmentsStep project={project} step={project.segments} />;
    case 'image_prompts':
      return <ImagePromptsStep project={project} step={project.imagePrompts} />;
    case 'image_generation':
      return <ImagesStep project={project} step={project.imageGeneration} />;
    case 'video_generation':
      return <VideosStep project={project} step={project.videoGeneration} />;
    case 'video_composition':
      return <CompositionStep project={project} step={project.videoComposition} />;
    case 'thumbnail':
      return <ThumbnailStep project={project} step={project.thumbnail} />;
    case 'distribution':
      return <DistributionStep project={project} step={project.distribution} />;
    default:
      return <div className="text-slate-400">Unknown step</div>;
  }
}

export default StepContent;
