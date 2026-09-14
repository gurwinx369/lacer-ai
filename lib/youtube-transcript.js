import { getSubtitles } from 'youtube-caption-extractor';
import { extractYoutubeId } from './youtube.js';

const MAX_CAPTION_COUNT = 50000;
const MAX_TOTAL_TEXT_LENGTH = 1000000;
const MAX_RETRIES = 2;
const TRANSCRIPT_BLOCK_SECONDS = 45;
const MAX_BLOCK_TEXT_LENGTH = 2500;

function parseFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeCaptionText(text) {
    if (typeof text !== 'string') return '';

    return text
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeCaptions(rawCaptions) {
    if (!Array.isArray(rawCaptions) || rawCaptions.length === 0) {
        throw new Error('No captions were found for this video.');
    }

    const captions = [];
    let totalTextLength = 0;

    for (const caption of rawCaptions) {
        const startSeconds = parseFiniteNumber(caption?.start);
        const durationSeconds = parseFiniteNumber(caption?.dur);
        const text = normalizeCaptionText(caption?.text);

        if (
            startSeconds === null ||
            durationSeconds === null ||
            startSeconds < 0 ||
            durationSeconds <= 0 ||
            !text
        ) {
            continue;
        }

        const endSeconds = startSeconds + durationSeconds;

        if (!Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
            continue;
        }

        totalTextLength += text.length;

        if (totalTextLength > MAX_TOTAL_TEXT_LENGTH) {
            throw new Error('The video transcript exceeds the supported processing size.');
        }

        captions.push({
            startSeconds,
            endSeconds,
            text,
        });

        if (captions.length > MAX_CAPTION_COUNT) {
            throw new Error('The video transcript contains too many caption segments.');
        }
    }

    if (captions.length === 0) {
        throw new Error('No usable captions were found for this video.');
    }

    captions.sort((a, b) => a.startSeconds - b.startSeconds);

    return captions;
}

function buildTranscriptBlocks(captions) {
    const blocks = [];
    let currentBlock = null;

    for (const caption of captions) {
        if (!currentBlock) {
            currentBlock = {
                startSeconds: caption.startSeconds,
                endSeconds: caption.endSeconds,
                text: caption.text,
            };
            continue;
        }

        const elapsed = caption.endSeconds - currentBlock.startSeconds;
        const combinedLength =
            currentBlock.text.length + 1 + caption.text.length;

        const shouldStartNewBlock =
            elapsed > TRANSCRIPT_BLOCK_SECONDS ||
            combinedLength > MAX_BLOCK_TEXT_LENGTH;

        if (shouldStartNewBlock) {
            blocks.push(currentBlock);

            currentBlock = {
                startSeconds: caption.startSeconds,
                endSeconds: caption.endSeconds,
                text: caption.text,
            };

            continue;
        }

        currentBlock.endSeconds = Math.max(
            currentBlock.endSeconds,
            caption.endSeconds
        );

        currentBlock.text = `${currentBlock.text} ${caption.text}`.trim();
    }

    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
}

async function fetchSubtitles(videoId) {
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            return await getSubtitles({
                videoID: videoId,
                lang: 'en',
            });
        } catch (error) {
            lastError = error;

            if (attempt < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
            }
        }
    }

    console.error(
        '[youtube-transcript] Caption extraction failed:',
        lastError?.message || 'Unknown error'
    );

    throw new Error(
        'Unable to extract captions from the reference video. Make sure the video has accessible captions.'
    );
}

/**
 * Extracts and normalizes the English YouTube transcript.
 *
 * @param {string} youtubeUrl
 * @returns {Promise<{
 *   videoId: string,
 *   durationSeconds: number,
 *   captions: Array<{
 *     startSeconds: number,
 *     endSeconds: number,
 *     text: string
 *   }>
 * }>}
 */
export async function extractYoutubeTranscript(youtubeUrl) {
    const videoId = extractYoutubeId(youtubeUrl);

    if (!videoId) {
        throw new Error('Invalid YouTube URL.');
    }

    const rawCaptions = await fetchSubtitles(videoId);
    const captions = normalizeCaptions(rawCaptions);

    const durationSeconds = captions.reduce(
        (max, caption) => Math.max(max, caption.endSeconds),
        0
    );

    const blocks = buildTranscriptBlocks(captions);

    return {
        videoId,
        durationSeconds,
        captions,
        blocks,
    };
}