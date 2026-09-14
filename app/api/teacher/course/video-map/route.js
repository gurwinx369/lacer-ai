import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import { mapCourseVideo } from '@/lib/map-course-video';

const DSA_SLUG = 'dsa';

export async function POST() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    if (session.role !== 'teacher') {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
        );
    }

    try {
        await connectDB();

        const course = await Course.findOne({
            slug: DSA_SLUG,
            createdBy: session.userId,
        });

        if (!course) {
            return NextResponse.json(
                {
                    error:
                        'Course not found. Please complete course setup first.',
                },
                { status: 404 }
            );
        }

        if (course.status !== 'ready') {
            return NextResponse.json(
                {
                    error:
                        'Course must have a generated curriculum before video mapping.',
                },
                { status: 409 }
            );
        }

        if (!course.generatedStructure) {
            return NextResponse.json(
                {
                    error:
                        'Course curriculum is not available for video mapping.',
                },
                { status: 409 }
            );
        }

        if (
            typeof course.youtubeUrl !== 'string' ||
            !course.youtubeUrl.trim()
        ) {
            return NextResponse.json(
                {
                    error:
                        'No reference YouTube video has been configured.',
                },
                { status: 400 }
            );
        }

        /*
         * Video mapping intentionally happens BEFORE course confirmation.
         * confirmedAt is therefore not required here.
         */

        const result = await mapCourseVideo(course);

        /*
         * Only mutate the course after the complete mapping operation
         * succeeds. This means a transcript/Gemini failure does not
         * destroy the existing curriculum or existing mappings.
         */
        course.videoChunks = result.mappings;
        course.processingError = null;

        await course.save();

        return NextResponse.json({
            success: true,
            videoId: result.videoId,
            durationSeconds: result.durationSeconds,
            videoChunks: course.videoChunks,
        });
    } catch (err) {
        console.error(
            '[POST /api/teacher/course/video-map]',
            err.message
        );

        /*
         * Never expose Gemini/provider internals to the browser.
         */
        const knownErrors = new Set([
            'Course does not have a reference YouTube video.',
            'Course has an invalid YouTube URL.',
            'No usable transcript was found for the reference video.',
            'Reference video duration could not be determined.',
            'Course does not contain a generated curriculum.',
            'Course does not contain any canonical concepts.',
        ]);

        const errorMessage = knownErrors.has(err.message)
            ? err.message
            : 'Unable to generate video mappings. Please try again.';

        return NextResponse.json(
            { error: errorMessage },
            {
                status: knownErrors.has(err.message)
                    ? 400
                    : 500,
            }
        );
    }
}