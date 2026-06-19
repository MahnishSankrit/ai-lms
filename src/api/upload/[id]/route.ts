import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, {params} : {params: {id: string}}){
    try {
        const session = await getServerSession(authOptions);
        if(!session){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            )
        }
        if(session.user.role !== "teacher"){
            return NextResponse.json(
                {error: "Forbidden"},
                {status: 403}
            )
        }

        const {id} =  params
        //finding the uploads 
        const upload = await prisma.upload.findUnique({
            where: {
                id: id,
            }
        })
        if(!upload){    
            return NextResponse.json(
                {error: "Upload not found"},
                {status: 404}
            )
        }

        // owernship check
        const teacher = await prisma.user.findUnique({
            where: {
                email: session.user.email || undefined,
            }
        })
        if(!teacher){
            return NextResponse.json(
                {error: "Teacher not found"},
                {status: 404}
            )
        }

        if(upload.uploadedById !== teacher.id){
            return NextResponse.json(
                {error: "Forbidden, you are not the owner of this upload"},
                {status: 403}
            )
        }

        //download the file from cloudinary using the url in the upload record
        const response = await fetch(upload.fileUrl);
        if(!response.ok){
            return NextResponse.json(
                {error: "Failed to download the file from cloudinary"},
                {status: 500}
            )
        }
        // convert to the buffer  , this buffer will be used to parse the questions from the file
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // thos is for the next step where we will parse the questions from the file using the buffer

        // dynamically import pdf-parse
        const pdfModule = await import("pdf-parse") as Record<string, unknown>;
        const pdfParse = pdfModule.default as (buffer: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(buffer);
        const text = data.text;
        
        if(!text){
            return NextResponse.json(
                {error: "Failed to extract text from the PDF file"},
                {status: 500}
            )
        }

        return NextResponse.json(
            {text: text},
            {status: 200}
        )

    } catch (error) {
        console.error("Error in POST /api/upload/[id]:", error);
        return NextResponse.json(
            {error: "Internal Server Error"},
            {status: 500}
        )
    }
}


