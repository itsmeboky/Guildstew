import { uploadFile } from '@/utils/uploadFile';

/**
 * Integration shims. The old Base44 integrations object proxied
 * through Edge Functions that were never deployed. Only UploadFile
 * actually works — it goes straight to Supabase Storage now. The
 * rest are stubs that log a warning so callers don't crash.
 */
export const Core = {
  async UploadFile({ file, bucket, path }) {
    return uploadFile(file, bucket || 'campaign-assets', path || '');
  },
  async InvokeLLM() { console.warn('LLM not implemented yet'); return { result: '' }; },
  async GenerateImage() { console.warn('Image gen not implemented yet'); return { url: '' }; },
  async SendEmail() { console.warn('Email not implemented yet'); },
  async SendSMS() { console.warn('SMS not implemented yet'); },
  async ExtractDataFromUploadedFile() { console.warn('Not implemented'); },
};

export const UploadFile = Core.UploadFile;
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const SendSMS = Core.SendSMS;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;

export const integrations = { Core };
