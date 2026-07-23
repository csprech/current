/**
 * Subject References
 *
 * A subject is a named set of reference photos (a character, a person, a
 * product) stored at the project level. Image generators can attach one;
 * at run time its photos are prepended to the model's image inputs with an
 * instruction to keep the subject's identity consistent — the mechanism the
 * Gemini image models use for character consistency across scenes.
 */

export const MAX_SUBJECT_IMAGES = 4;

export interface SubjectReference {
  id: string;
  /** How prompts and the UI refer to this subject (e.g. "Maya"). */
  name: string;
  /** Optional descriptor woven into the consistency instruction. */
  description?: string;
  /** 1–4 reference photos as data URLs. */
  images: string[];
  createdAt: number;
}
