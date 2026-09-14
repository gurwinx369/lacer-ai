import { extractYoutubeTranscript } from './youtube-transcript.js';
import { mapVideoConcepts } from './gemini.js';
import { isValidYoutubeUrl } from '../models/Course.js';

const TRANSCRIPT_BATCH_SIZE = 40;
const MAX_MAPPING_DURATION_SECONDS = 15 * 60;
const TIMESTAMP_TOLERANCE_SECONDS = 10;

function getConceptKey(levelOrder, conceptOrder) {
    return `${levelOrder}:${conceptOrder}`;
}

function flattenCanonicalConcepts(course) {
    const levels = course?.generatedStructure?.levels;

    if (!Array.isArray(levels) || levels.length === 0) {
        throw new Error('Course does not contain a generated curriculum.');
    }

    const concepts = [];

    for (const [levelIndex, level] of levels.entries()) {
        const levelOrder =
            Number.isInteger(level?.order) && level.order > 0
                ? level.order
                : levelIndex + 1;

        if (!Array.isArray(level?.concepts)) {
            continue;
        }

        for (const [conceptIndex, concept] of level.concepts.entries()) {
            const conceptOrder =
                Number.isInteger(concept?.order) && concept.order > 0
                    ? concept.order
                    : conceptIndex + 1;

            if (
                !concept?.title ||
                typeof concept.title !== 'string' ||
                !concept.title.trim()
            ) {
                continue;
            }

            concepts.push({
                levelOrder,
                conceptOrder,
                title: concept.title.trim(),
                description:
                    typeof concept.description === 'string'
                        ? concept.description.trim()
                        : '',
                learningObjectives: Array.isArray(
                    concept.learningObjectives
                )
                    ? concept.learningObjectives.filter(
                        (objective) =>
                            typeof objective === 'string' &&
                            objective.trim()
                    )
                    : [],
            });
        }
    }

    if (concepts.length === 0) {
        throw new Error(
            'Course does not contain any canonical concepts.'
        );
    }

    return concepts;
}

function validateMappingAgainstTranscript(
    mapping,
    conceptsByKey,
    transcriptBlocks,
    durationSeconds
) {
    if (
        !Number.isInteger(mapping?.levelOrder) ||
        mapping.levelOrder < 1
    ) {
        return null;
    }

    if (
        !Number.isInteger(mapping?.conceptOrder) ||
        mapping.conceptOrder < 1
    ) {
        return null;
    }

    const conceptKey = getConceptKey(
        mapping.levelOrder,
        mapping.conceptOrder
    );

    if (!conceptsByKey.has(conceptKey)) {
        return null;
    }

    if (
        typeof mapping.startSeconds !== 'number' ||
        !Number.isFinite(mapping.startSeconds) ||
        mapping.startSeconds < 0
    ) {
        return null;
    }

    if (
        typeof mapping.endSeconds !== 'number' ||
        !Number.isFinite(mapping.endSeconds) ||
        mapping.endSeconds <= mapping.startSeconds
    ) {
        return null;
    }

    if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
    ) {
        return null;
    }

    if (mapping.startSeconds >= durationSeconds) {
        return null;
    }

    if (
        mapping.endSeconds >
        durationSeconds + TIMESTAMP_TOLERANCE_SECONDS
    ) {
        return null;
    }

    const startSeconds = Math.max(
        0,
        mapping.startSeconds
    );

    const endSeconds = Math.min(
        durationSeconds,
        mapping.endSeconds
    );

    if (endSeconds <= startSeconds) {
        return null;
    }

    if (
        endSeconds - startSeconds >
        MAX_MAPPING_DURATION_SECONDS
    ) {
        return null;
    }

    const overlapsTranscript = transcriptBlocks.some(
        (block) =>
            Number.isFinite(block?.startSeconds) &&
            Number.isFinite(block?.endSeconds) &&
            block.endSeconds > startSeconds &&
            block.startSeconds < endSeconds
    );

    if (!overlapsTranscript) {
        return null;
    }

    return {
        levelOrder: mapping.levelOrder,
        conceptOrder: mapping.conceptOrder,
        startSeconds,
        endSeconds,
    };
}

function chooseBetterMapping(existing, candidate) {
    if (!existing) {
        return candidate;
    }

    const existingDuration =
        existing.endSeconds - existing.startSeconds;

    const candidateDuration =
        candidate.endSeconds - candidate.startSeconds;

    if (candidateDuration < existingDuration) {
        return candidate;
    }

    return existing;
}

async function mapConceptBatch(
    concepts,
    transcriptBlocks,
    durationSeconds
) {
    if (
        concepts.length === 0 ||
        transcriptBlocks.length === 0
    ) {
        return [];
    }

    const result = await mapVideoConcepts(
        concepts,
        transcriptBlocks
    );

    if (
        !result ||
        !Array.isArray(result.mappings)
    ) {
        throw new Error(
            'Gemini returned an invalid video mapping response.'
        );
    }

    const conceptsByKey = new Set(
        concepts.map((concept) =>
            getConceptKey(
                concept.levelOrder,
                concept.conceptOrder
            )
        )
    );

    const validatedMappings = [];

    for (const mapping of result.mappings) {
        const validated =
            validateMappingAgainstTranscript(
                mapping,
                conceptsByKey,
                transcriptBlocks,
                durationSeconds
            );

        if (validated) {
            validatedMappings.push(validated);
        }
    }

    return validatedMappings;
}

export async function mapCourseVideo(course) {
    if (!course) {
        throw new Error(
            'Course is required for video mapping.'
        );
    }

    const youtubeUrl =
        typeof course.youtubeUrl === 'string'
            ? course.youtubeUrl.trim()
            : '';

    if (!youtubeUrl) {
        throw new Error(
            'Course does not have a reference YouTube video.'
        );
    }

    if (!isValidYoutubeUrl(youtubeUrl)) {
        throw new Error(
            'Course has an invalid YouTube URL.'
        );
    }

    const concepts =
        flattenCanonicalConcepts(course);

    const transcript =
        await extractYoutubeTranscript(youtubeUrl);

    if (
        !transcript ||
        !Array.isArray(transcript.blocks) ||
        transcript.blocks.length === 0
    ) {
        throw new Error(
            'No usable transcript was found for the reference video.'
        );
    }

    if (
        !Number.isFinite(
            transcript.durationSeconds
        ) ||
        transcript.durationSeconds <= 0
    ) {
        throw new Error(
            'Reference video duration could not be determined.'
        );
    }

    const conceptsByKey = new Map(
        concepts.map((concept) => [
            getConceptKey(
                concept.levelOrder,
                concept.conceptOrder
            ),
            concept,
        ])
    );

    const mappingsByConcept = new Map();

    for (
        let startIndex = 0;
        startIndex < transcript.blocks.length;
        startIndex += TRANSCRIPT_BATCH_SIZE
    ) {
        const transcriptBlocks =
            transcript.blocks.slice(
                startIndex,
                startIndex + TRANSCRIPT_BATCH_SIZE
            );

        if (transcriptBlocks.length === 0) {
            continue;
        }

        const remainingConcepts =
            concepts.filter(
                (concept) =>
                    !mappingsByConcept.has(
                        getConceptKey(
                            concept.levelOrder,
                            concept.conceptOrder
                        )
                    )
            );

        if (remainingConcepts.length === 0) {
            break;
        }

        const batchMappings =
            await mapConceptBatch(
                remainingConcepts,
                transcriptBlocks,
                transcript.durationSeconds
            );

        for (const mapping of batchMappings) {
            const key = getConceptKey(
                mapping.levelOrder,
                mapping.conceptOrder
            );

            if (!conceptsByKey.has(key)) {
                continue;
            }

            const existing =
                mappingsByConcept.get(key);

            mappingsByConcept.set(
                key,
                chooseBetterMapping(
                    existing,
                    mapping
                )
            );
        }
    }

    const mappings = Array.from(
        mappingsByConcept.values()
    ).sort((a, b) => {
        if (a.levelOrder !== b.levelOrder) {
            return a.levelOrder - b.levelOrder;
        }

        return a.conceptOrder - b.conceptOrder;
    });

    return {
        videoId: transcript.videoId,
        durationSeconds: transcript.durationSeconds,
        mappings,
    };
}