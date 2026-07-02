import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
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

        // validating the pdf file
        // step 1: check if the request has a pdf file
        const formData = await req.formData();
        const pdfFile = formData.get("pdf");
        if (!pdfFile || !(pdfFile instanceof File)) {
            return NextResponse.json(
                { error: "Invalid PDF file" },
                { status: 400 }
            )
        }

        // step 2: check if the pdf file is of type application/pdf
        const allowedTypes = ["application/pdf"];
        if (!allowedTypes.includes(pdfFile.type)) {
            return NextResponse.json(
                { error: "Invalid PDF file type" },
                { status: 400 }
            )
        }

        // step 3: validate the size of the pdf file, it should not exceed 10MB
        const maxSize = 10 * 1024 * 1024;
        if (pdfFile.size > maxSize) {
            return NextResponse.json(
                { error: "PDF file too large" },
                { status: 400 }
            )
        }

        // step 4 validate the pdf header
        const arrayBuffer = await pdfFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const header = buffer.toString("utf8", 0, 5);
        if (header !== "%PDF-") {
            return NextResponse.json(
                { error: "Invalid PDF file header" },
                { status: 400 }
            )
        }


        // read the pdf file as an array buffer
        const pdfModule = await import("pdf-parse") as Record<string, unknown>;
        const pdf = pdfModule.default as (buffer: Buffer) => Promise<{ text: string }>;
        const data = await pdf(buffer);

        if (!data.text.trim()) {
            return NextResponse.json(
                { error: "No readable text found in PDF", },
                { status: 400, }
            );
        }

        const text = data.text.trim();

        return NextResponse.json(
            { message: "PDF text extracted successfully", text },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error in POST /api/ai/extract-pdf:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        )
    }
}




