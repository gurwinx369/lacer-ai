import 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_TEXT_LENGTH = 50;

export async function extractPdfText(file) {
  if (!file || typeof file.name !== 'string') {
    throw new Error('No file was provided.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext !== 'pdf') {
    throw new Error('Only PDF files are accepted. Please upload a .pdf file.');
  }

  if (file.size > MAX_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `File is too large (${mb} MB). Maximum allowed size is 5 MB.`
    );
  }

  if (file.size === 0) {
    throw new Error('The uploaded file is empty.');
  }

  let buffer;

  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    throw new Error('Failed to read the uploaded file. Please try again.');
  }

  if (
    buffer.length < 5 ||
    buffer.toString('ascii', 0, 4) !== '%PDF'
  ) {
    throw new Error(
      'The uploaded file does not appear to be a valid PDF.'
    );
  }

  let parsed;

  try {
    const parser = new PDFParse({ data: buffer });
    parsed = await parser.getText();
    await parser.destroy();
  } catch (error) {
    console.error('[parsePdf] PDF parsing failed:', error);

    throw new Error(
      'Could not read the PDF. The file may be corrupt or password-protected.'
    );
  }

  const text = (parsed?.text ?? '').trim();

  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(
      'No readable text could be extracted from this PDF. ' +
      'Please ensure the syllabus is a text-based PDF (not a scanned image).'
    );
  }

  return {
    text,
    meta: {
      originalName: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date(),
    },
  };
}