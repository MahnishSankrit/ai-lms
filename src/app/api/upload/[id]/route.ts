import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFParse } from "pdf-parse";

/**
 * @swagger
 * /api/upload/{id}:
 *   post:
 *     tags: [AI]
 *     summary: Re-download a previously uploaded file from Cloudinary and extract its PDF text
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The uploadId from POST /api/questions/upload
 *     responses:
 *       200:
 *         description: Extracted text
 *       401:
 *         description: Not logged in
 *       403:
 *         description: Not a teacher, or not the upload's owner
 *       404:
 *         description: Upload record not found, or teacher not found
 *       500:
 *         description: Failed to download from Cloudinary, or failed to extract text
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (session.user.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            )
        }

        const { id } = await params
        //finding the uploads 
        const upload = await prisma.upload.findUnique({
            where: {
                id: id,
            }
        })
        if (!upload) {
            return NextResponse.json(
                { error: "Upload not found" },
                { status: 404 }
            )
        }

        // owernship check
        const teacher = await prisma.user.findUnique({
            where: {
                email: session.user.email || undefined,
            }
        })
        if (!teacher) {
            return NextResponse.json(
                { error: "Teacher not found" },
                { status: 404 }
            )
        }

        if (upload.uploadedById !== teacher.id) {
            return NextResponse.json(
                { error: "Forbidden, you are not the owner of this upload" },
                { status: 403 }
            )
        }

        //download the file from cloudinary using the url in the upload record
        const response = await fetch(upload.fileUrl);
        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to download the file from cloudinary" },
                { status: 500 }
            )
        }
        // convert to the buffer  , this buffer will be used to parse the questions from the file
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // thos is for the next step where we will parse the questions from the file using the buffer

        // dynamically parse the PDF using the current pdf-parse API
        const pdfParse = new PDFParse({ data: buffer });
        const data = await pdfParse.getText();
        const text = data.text;

        if (!text) {
            return NextResponse.json(
                { error: "Failed to extract text from the PDF file" },
                { status: 500 }
            )
        }

        return NextResponse.json(
            { text: text },
            { status: 200 }
        )

    } catch (error) {
        console.error("Error in POST /api/upload/[id]:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}


