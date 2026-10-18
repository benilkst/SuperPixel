/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UpscaleMode = 'ai' | 'algorithmic';

export interface UpscaleJobConfig {
  inputWidth: number;
  inputHeight: number;
  requestedScale: 2 | 4;
  effectiveScale: number;
  outputWidth: number;
  outputHeight: number;
  limit4K: boolean;
  tileSize: number;
  overlap: number;
  mode: UpscaleMode;
  modelUrl?: string;
  customModelBuffer?: ArrayBuffer;
}

export type WorkerIncomingMessage =
  | {
      type: 'START_UPSCALE';
      payload: {
        config: UpscaleJobConfig;
        sourceBuffer: ArrayBuffer;
        sourceWidth: number;
        sourceHeight: number;
      };
    }
  | {
      type: 'CANCEL';
    };

export type WorkerOutgoingMessage =
  | {
      type: 'PROGRESS';
      payload: {
        currentTile: number;
        totalTiles: number;
        percentage: number;
        statusText: string;
        phase: string;
      };
    }
  | {
      type: 'MODE_FALLBACK';
      payload: {
        reason: string;
        isCorsError?: boolean;
        offerLocalModelFile?: boolean;
        modelName?: string;
      };
    }
  | {
      type: 'SUCCESS';
      payload: {
        outputBuffer: ArrayBuffer;
        outputWidth: number;
        outputHeight: number;
        actualMode: UpscaleMode;
        executionProvider: string;
        elapsedMs: number;
      };
    }
  | {
      type: 'ERROR';
      payload: {
        message: string;
        stack?: string;
      };
    }
  | {
      type: 'CANCELLED';
    };
