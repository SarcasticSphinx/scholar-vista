/**
 * Typed UploadThing React helpers for ScholarVista.
 *
 * Re-exports `UploadButton`, `UploadDropzone`, `useUploadThing`, and
 * `uploadFiles` pre-bound to our `OurFileRouter` so call sites get
 * full type-safety on endpoint names and `onClientUploadComplete`
 * payload shapes (Req 26.1, 26.5).
 *
 * Usage:
 *
 *   import { UploadButton } from "@/lib/uploadthing";
 *
 *   <UploadButton
 *     endpoint="profileImage"
 *     onClientUploadComplete={(res) => { /* res[0].serverData.url *\/ }}
 *   />
 *
 * Validates: Requirements 26.1, 26.5.
 */

import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
import {
  validateImage,
  type ImageValidationResult,
} from "@/lib/image-validator";

/**
 * Typed <UploadButton /> bound to {@link OurFileRouter}.
 *
 * The `endpoint` prop is type-narrowed to one of `"profileImage"`,
 * `"scholarshipImage"`, or `"universityLogo"`.
 */
export const UploadButton = generateUploadButton<OurFileRouter>();

/**
 * Typed <UploadDropzone /> bound to {@link OurFileRouter}.
 */
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

/**
 * Typed React hook + imperative uploader bound to {@link OurFileRouter}.
 *
 * - `useUploadThing(endpoint, opts?)` for in-component upload state.
 * - `uploadFiles(endpoint, { files, input? })` for imperative uploads
 *   (e.g. inside an event handler outside a component).
 */
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();


/**
 * Build an `onBeforeUploadBegin` handler that runs {@link validateImage} on
 * every file before UploadThing requests presigned URLs. Files that fail the
 * client-side mime/size check are filtered out and reported via `onReject`,
 * so the upload never starts for an invalid file (Req 26.3).
 *
 * Usage:
 *
 *   <UploadButton
 *     endpoint="profileImage"
 *     onBeforeUploadBegin={validateBeforeUpload({
 *       onReject: (file, result) => toast.error(result.message),
 *     })}
 *     onClientUploadComplete={...}
 *   />
 */
export function validateBeforeUpload(opts?: {
  onReject?: (file: File, result: Extract<ImageValidationResult, { ok: false }>) => void;
}): (files: File[]) => File[] {
  return (files) => {
    const accepted: File[] = [];
    for (const file of files) {
      const result = validateImage(file);
      if (result.ok) {
        accepted.push(file);
      } else {
        opts?.onReject?.(file, result);
      }
    }
    return accepted;
  };
}
